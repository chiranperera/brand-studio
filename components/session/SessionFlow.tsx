"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BANK } from "@/lib/question-bank";
import type { Question } from "@/lib/question-engine";
import { writeField, type AnswerValue } from "@/lib/mapping";
import { computeCompleteness, emptyBrandData, type BrandDataObject } from "@/lib/brand-data";
import { QuestionCard } from "./QuestionCard";
import { ProgressRail } from "./ProgressRail";
import { ReferenceUpload } from "@/components/projects/ReferenceUpload";
import type { AnswerVal } from "./InputArea";

/** One step in the session. `id` is present once the answer is persisted. */
interface Item {
  id?: string;
  question: Question;
  value: AnswerVal;
  note: string;
}

export interface InitialAnswer {
  id: string;
  question: Question;
  value: AnswerVal;
  note: string;
}

interface SessionAsset {
  id: string;
  kind: string;
  source: string | null;
  storage_path: string | null;
  sentiment: string | null;
  note: string | null;
}

const blankValue = (q: Question): AnswerVal => (q.inputType === "multiselect" ? [] : "");
const isEmpty = (v: AnswerVal) => v === "" || v == null || (Array.isArray(v) && v.length === 0);

export function SessionFlow({
  projectId,
  sessionId,
  mode,
  initialBrandData,
  initialAnswers,
  initialAssets,
}: {
  projectId: string;
  sessionId: string;
  mode: "ai" | "standard";
  initialBrandData: BrandDataObject;
  initialAnswers: InitialAnswer[];
  initialAssets: SessionAsset[];
}) {
  const [items, setItems] = useState<Item[]>(
    initialAnswers.map((a) => ({ id: a.id, question: a.question, value: a.value, note: a.note }))
  );
  const [pos, setPos] = useState(0);
  const [bd, setBd] = useState<BrandDataObject>(initialBrandData);
  const [refLen, setRefLen] = useState(initialBrandData.references.length);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [showRefs, setShowRefs] = useState(false);
  const [dirty, setDirty] = useState(false);
  const started = useRef(false);

  const { score, missing } = computeCompleteness(bd);
  const refCount = refLen;

  /** Rebuild brand_data by replaying every persisted answer (order-independent, edit-safe). */
  function rebuild(its: Item[], refs: number): BrandDataObject {
    let b = emptyBrandData();
    b.project = { ...bd.project }; // keep client/contact/email/industry
    for (const it of its) {
      if (!it.id) continue;
      if (it.question.field && !isEmpty(it.value)) b = writeField(b, it.question.field, it.value as AnswerValue);
    }
    b.references = Array.from({ length: refs }, () => ({ type: "upload" }));
    const c = computeCompleteness(b);
    b.meta = { ...b.meta, completeness: c.score, requiredMissing: c.missing };
    return b;
  }

  /** Persist item `i` (insert or update), rebuild brand_data, return the updated items. */
  async function commit(i: number, its: Item[]): Promise<Item[]> {
    const supabase = createClient();
    const it = its[i];
    const ans = isEmpty(it.value) ? null : it.value;
    let id = it.id;
    if (id) {
      await supabase.from("answers").update({ answer: ans as never, note: it.note || null }).eq("id", id);
    } else {
      const { data } = await supabase
        .from("answers")
        .insert({
          session_id: sessionId,
          project_id: projectId,
          field_path: it.question.field ?? null,
          section: it.question.section,
          question: it.question.question,
          input_type: it.question.inputType,
          answer: ans as never,
          note: it.note || null,
          position: i,
        })
        .select("id")
        .single();
      id = data?.id;
    }
    const next = its.map((x, idx) => (idx === i ? { ...it, id } : x));
    setItems(next);
    const b = rebuild(next, refLen);
    setBd(b);
    await supabase
      .from("projects")
      .update({
        brand_data: b,
        completeness: b.meta.completeness,
        status: b.meta.requiredMissing.length === 0 ? "ready" : "discovery",
      })
      .eq("id", projectId);
    return next;
  }

  /** Append the next question (or finish). Returns nothing; updates state. */
  async function loadNext(its: Item[]) {
    setError(null);
    const answeredCount = its.filter((x) => x.id).length;

    if (mode === "standard") {
      if (answeredCount >= BANK.length) {
        setDone(true);
        return;
      }
      const q = BANK[answeredCount];
      const ni = [...its, { question: q, value: blankValue(q), note: "" }];
      setItems(ni);
      setPos(ni.length - 1);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not generate a question.");
      const q = json.question as Question;
      if (q.interviewComplete) {
        setDone(true);
        return;
      }
      const ni = [...its, { question: q, value: blankValue(q), note: "" }];
      setItems(ni);
      setPos(ni.length - 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // On mount: show the frontier (continue), generating the next question if needed.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void loadNext(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patchCurrent(patch: Partial<Item>) {
    setItems((prev) => prev.map((x, idx) => (idx === pos ? { ...x, ...patch } : x)));
    setDirty(true);
  }

  async function commitIfDirty() {
    if (dirty && items[pos]?.id) {
      await commit(pos, items);
      setDirty(false);
    }
  }

  async function primary() {
    const cur = items[pos];
    if (!cur) return;
    setBusy(true);
    const wasFrontier = !cur.id;
    const next = await commit(pos, items);
    setDirty(false);
    if (wasFrontier) {
      await loadNext(next);
    } else {
      setPos((p) => Math.min(p + 1, next.length - 1));
    }
    setBusy(false);
  }

  async function skip() {
    const cur = items[pos];
    if (!cur) return;
    setBusy(true);
    const cleared = items.map((x, idx) => (idx === pos ? { ...x, value: blankValue(x.question) } : x));
    const next = await commit(pos, cleared);
    setDirty(false);
    await loadNext(next);
    setBusy(false);
  }

  async function back() {
    if (pos === 0) return;
    await commitIfDirty();
    setDone(false);
    setPos((p) => Math.max(0, p - 1));
  }

  async function jump(i: number) {
    await commitIfDirty();
    setDone(false);
    setPos(i);
  }

  const onRefsChange = (count: number) => {
    setRefLen(count);
    setBd((b) => ({ ...b, references: Array.from({ length: count }, () => ({ type: "upload" })) }));
  };

  const current = items[pos];
  const answeredTotal = items.filter((x) => x.id).length;

  const refPanel = (
    <div className="card">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-medium">Reference images</h3>
        <span className="mono text-xs text-ink-4">{refCount} added</span>
      </div>
      <p className="mb-4 text-sm text-ink-3">
        Upload inspiration, competitor screenshots, or the client&apos;s existing logo/photos — tag each love / like /
        avoid. At least one is required for a complete pack.
      </p>
      <ReferenceUpload projectId={projectId} initialAssets={initialAssets} onReferencesChange={onRefsChange} />
    </div>
  );

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        {error && (
          <div className="card border-red-500/40 text-sm text-red-300">
            <b>Couldn&apos;t generate a question.</b> {error}
            <div className="mt-2 flex gap-2">
              <button className="btn-ghost" onClick={() => void loadNext(items)}>
                ↻ Try again
              </button>
              <Link className="btn-ghost" href={`/projects/${projectId}/export`}>
                Go to export
              </Link>
            </div>
          </div>
        )}

        {done ? (
          <>
            <div className="card text-center">
              <h2 className="text-xl font-medium">Questions done — last step: references</h2>
              <p className="mt-2 text-sm text-ink-3">
                {missing.length === 0
                  ? "All required fields captured. You're ready to export a Design Pack."
                  : refCount === 0
                    ? "Add at least one reference image below to reach 100%, then export."
                    : `${missing.length} required field(s) still missing — you can keep going or export with an override.`}
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setDone(false);
                    if (items.length) setPos(items.length - 1);
                  }}
                >
                  Back to questions
                </button>
                <Link className="btn-primary" href={`/projects/${projectId}/export`}>
                  Export Design Pack
                </Link>
              </div>
            </div>
            {refPanel}
          </>
        ) : current ? (
          <QuestionCard
            question={current.question}
            index={pos}
            total={items.length}
            value={current.value}
            onChange={(v) => patchCurrent({ value: v })}
            note={current.note}
            onNote={(n) => patchCurrent({ note: n })}
            onSubmit={primary}
            submitLabel={current.id ? "Save & next" : "Next"}
            onBack={back}
            canGoBack={pos > 0}
            onSkip={skip}
            showSkip={!current.id}
            onRegenerate={mode === "ai" && !current.id ? () => void loadNext(items.slice(0, pos)) : undefined}
            busy={busy}
          />
        ) : (
          <div className="card text-ink-3">{busy ? "Generating the first question…" : "Loading…"}</div>
        )}

        {!done && showRefs && refPanel}

        <div className="flex items-center justify-between text-sm text-ink-4">
          <Link href={`/projects/${projectId}`} className="hover:text-ink">
            ← Project overview
          </Link>
          <div className="flex items-center gap-4">
            {!done && (
              <button className="hover:text-ink" onClick={() => setShowRefs((s) => !s)}>
                📎 References ({refCount})
              </button>
            )}
            <button
              className="hover:text-ink"
              onClick={async () => {
                await commitIfDirty();
                setDone(true);
              }}
            >
              Finish &amp; add references →
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 md:sticky md:top-20 md:h-fit">
        <ProgressRail score={score} missing={missing} answered={answeredTotal} />

        {items.length > 0 && (
          <nav className="card max-h-[50vh] overflow-auto">
            <span className="label">Jump to question</span>
            <ol className="space-y-1">
              {items.map((it, i) => {
                const isCurrent = i === pos && !done;
                const answered = !!it.id && !isEmpty(it.value);
                return (
                  <li key={it.id ?? `frontier-${i}`}>
                    <button
                      className={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                        isCurrent ? "bg-accent/10 text-ink" : "text-ink-3 hover:bg-panel2 hover:text-ink"
                      }`}
                      onClick={() => void jump(i)}
                    >
                      <span className="mono mt-0.5 w-6 shrink-0 text-xs text-ink-4">Q{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{it.question.question}</span>
                        <span className="mono text-[10px] text-ink-4">
                          {it.question.section}
                          {it.id ? (answered ? " · answered" : " · skipped") : " · current"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
      </div>
    </div>
  );
}
