"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BANK } from "@/lib/question-bank";
import type { Question } from "@/lib/question-engine";
import { writeField, type AnswerValue } from "@/lib/mapping";
import { computeCompleteness, emptyBrandData, type BrandDataObject, type LogoType } from "@/lib/brand-data";
import { QuestionCard } from "./QuestionCard";
import { ProgressRail } from "./ProgressRail";
import { LogoTypePicker } from "./LogoTypePicker";
import { ScopePicker, type ScopeData } from "./ScopePicker";
import { ReferenceUpload } from "@/components/projects/ReferenceUpload";
import type { AnswerVal } from "./InputArea";

type Phase = "questions" | "scope" | "logo" | "done";
type Surface = { kind: string; screens: string[]; components: string[] };
type Automation = BrandDataObject["automation"];

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
  const [phase, setPhase] = useState<Phase>("questions");
  const [logoTypes, setLogoTypes] = useState<LogoType[]>(initialBrandData.logo?.preferredTypes ?? []);
  const [surfaces, setSurfaces] = useState<Surface[]>(initialBrandData.surfaces ?? []);
  const [automation, setAutomation] = useState<Automation>(
    initialBrandData.automation ?? { needs: [], workflows: [] }
  );
  const [showRefs, setShowRefs] = useState(false);
  const [dirty, setDirty] = useState(false);
  const started = useRef(false);

  const { score, missing } = computeCompleteness(bd);
  const refCount = refLen;

  /** Picker-captured fields that live outside the answer log. */
  interface Extras {
    logoTypes: LogoType[];
    surfaces: Surface[];
    automation: Automation;
  }

  /** Rebuild brand_data by replaying every persisted answer (order-independent, edit-safe). */
  function rebuild(its: Item[], refs: number, extra: Extras): BrandDataObject {
    let b = emptyBrandData();
    b.project = { ...bd.project }; // keep client/contact/email/industry
    for (const it of its) {
      if (!it.id) continue;
      if (it.question.field && !isEmpty(it.value)) b = writeField(b, it.question.field, it.value as AnswerValue);
    }
    b.references = Array.from({ length: refs }, () => ({ type: "upload" }));
    b.logo = { ...b.logo, preferredTypes: extra.logoTypes }; // logo-type picker
    b.surfaces = extra.surfaces; // scope picker
    b.automation = extra.automation; // scope picker
    const c = computeCompleteness(b);
    b.meta = { ...b.meta, completeness: c.score, requiredMissing: c.missing };
    return b;
  }

  const currentExtras = (): Extras => ({ logoTypes, surfaces, automation });

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
    const b = rebuild(next, refLen, currentExtras());
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

  const scopeDone = surfaces.length > 0 && automation.needs.length > 0;
  const logoDone = logoTypes.length > 0;

  /** Questions are done → advance to the first unfinished space (scope → logo → done). */
  function finishQuestions() {
    setPhase(!scopeDone ? "scope" : !logoDone ? "logo" : "done");
  }

  async function persistBrand(b: BrandDataObject) {
    const supabase = createClient();
    await supabase
      .from("projects")
      .update({
        brand_data: b,
        completeness: b.meta.completeness,
        status: b.meta.requiredMissing.length === 0 ? "ready" : "discovery",
      })
      .eq("id", projectId);
  }

  /** Persist the scope (surfaces + AI automation) into brand_data. */
  async function commitScope(d: ScopeData) {
    setBusy(true);
    const nextSurfaces: Surface[] = d.kinds.map((kind) => ({ kind, screens: d.sections, components: d.features }));
    const nextAutomation: Automation = {
      needs: d.needs,
      level: d.level || undefined,
      workflows: d.workflows.split("\n").map((w) => w.trim()).filter(Boolean),
      notes: d.notes || undefined,
    };
    setSurfaces(nextSurfaces);
    setAutomation(nextAutomation);
    const b = rebuild(items, refLen, { logoTypes, surfaces: nextSurfaces, automation: nextAutomation });
    setBd(b);
    await persistBrand(b);
    setBusy(false);
  }

  /** Persist the logo-type selection into brand_data. */
  async function commitLogo(types: LogoType[]) {
    setBusy(true);
    const b = rebuild(items, refLen, { logoTypes: types, surfaces, automation });
    setBd(b);
    await persistBrand(b);
    setBusy(false);
  }

  /** Append the next question (or finish). Returns nothing; updates state. */
  async function loadNext(its: Item[]) {
    setError(null);
    const answeredCount = its.filter((x) => x.id).length;

    if (mode === "standard") {
      if (answeredCount >= BANK.length) {
        finishQuestions();
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
        finishQuestions();
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
    setPhase("questions");
    setPos((p) => Math.max(0, p - 1));
  }

  async function jump(i: number) {
    await commitIfDirty();
    setPhase("questions");
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
        <h3 className="font-medium">Reference images (optional)</h3>
        <span className="mono text-xs text-ink-4">{refCount} added</span>
      </div>
      <p className="mb-4 text-sm text-ink-3">
        Optional — and usually added later. After the session, gather inspiration, competitor screenshots, or the
        client&apos;s logo/photos, tag each love / like / avoid, and re-export. You can do this now or anytime from the
        project page.
      </p>
      <ReferenceUpload projectId={projectId} initialAssets={initialAssets} onReferencesChange={onRefsChange} />
    </div>
  );

  // Space 2.5: scope & build requirements (sections + AI automation).
  if (phase === "scope") {
    const scopeInitial: ScopeData = {
      kinds: surfaces.map((s) => s.kind),
      sections: Array.from(new Set(surfaces.flatMap((s) => s.screens))),
      features: Array.from(new Set(surfaces.flatMap((s) => s.components))),
      needs: automation.needs,
      level: automation.level ?? "",
      workflows: (automation.workflows ?? []).join("\n"),
      notes: automation.notes ?? "",
    };
    return (
      <ScopePicker
        initial={scopeInitial}
        onComplete={async (d) => {
          await commitScope(d);
          setPhase(logoDone ? "done" : "logo");
        }}
        onBack={() => {
          setPhase("questions");
          if (items.length) setPos(items.length - 1);
        }}
        busy={busy}
      />
    );
  }

  // Space 3: the visual logo-type picker.
  if (phase === "logo") {
    return (
      <LogoTypePicker
        selected={logoTypes}
        onChange={setLogoTypes}
        onComplete={async () => {
          await commitLogo(logoTypes);
          setPhase("done");
        }}
        onBack={() => setPhase("scope")}
        busy={busy}
      />
    );
  }

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

        {phase === "done" ? (
          <>
            <div className="card text-center">
              <h2 className="text-xl font-medium">Session complete</h2>
              <p className="mt-2 text-sm text-ink-3">
                {missing.length === 0
                  ? "All discovery categories captured — you can export the Design Pack now. Everything is saved, so you can also come back later to add reference images and re-export."
                  : `${missing.length} categor${missing.length === 1 ? "y is" : "ies are"} still open — keep going, or export with an override.`}
              </p>
              {logoTypes.length > 0 && (
                <p className="mono mt-2 text-xs text-ink-4">Logo type: {logoTypes.join(", ")}</p>
              )}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setPhase("questions");
                    if (items.length) setPos(items.length - 1);
                  }}
                >
                  Back to questions
                </button>
                <button className="btn-ghost" onClick={() => setPhase("scope")}>
                  Scope
                </button>
                <button className="btn-ghost" onClick={() => setPhase("logo")}>
                  Logo types
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

        {phase === "questions" && showRefs && refPanel}

        <div className="flex items-center justify-between text-sm text-ink-4">
          <Link href={`/projects/${projectId}`} className="hover:text-ink">
            ← Project overview
          </Link>
          {phase === "questions" && (
            <div className="flex items-center gap-4">
              <button className="hover:text-ink" onClick={() => setShowRefs((s) => !s)}>
                📎 References ({refCount})
              </button>
              <button
                className="hover:text-ink"
                onClick={async () => {
                  await commitIfDirty();
                  // Drop a trailing unanswered "current" placeholder so the
                  // saved question count stays stable.
                  setItems((prev) => (prev.length && !prev[prev.length - 1].id ? prev.slice(0, -1) : prev));
                  setPhase("scope");
                }}
              >
                Finish questions → scope
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 md:sticky md:top-20 md:h-fit">
        <ProgressRail score={score} missing={missing} answered={answeredTotal} />

        {items.length > 0 && (
          <nav className="card max-h-[50vh] overflow-auto">
            <span className="label">Jump to question</span>
            <ol className="space-y-1">
              {items.map((it, i) => {
                const isCurrent = i === pos && phase === "questions";
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
