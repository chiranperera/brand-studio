"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BANK } from "@/lib/question-bank";
import type { Question } from "@/lib/question-engine";
import { writeField, type AnswerValue } from "@/lib/mapping";
import { computeCompleteness, type BrandDataObject } from "@/lib/brand-data";
import { QuestionCard } from "./QuestionCard";
import { ProgressRail } from "./ProgressRail";
import { ReferenceUpload } from "@/components/projects/ReferenceUpload";
import type { AnswerVal } from "./InputArea";

interface SessionAsset {
  id: string;
  kind: string;
  source: string | null;
  storage_path: string | null;
  sentiment: string | null;
  note: string | null;
}

export function SessionFlow({
  projectId,
  sessionId,
  mode,
  initialBrandData,
  initialAnswered,
  initialAssets,
}: {
  projectId: string;
  sessionId: string;
  mode: "ai" | "standard";
  initialBrandData: BrandDataObject;
  initialAnswered: number;
  initialAssets: SessionAsset[];
}) {
  const [bd, setBd] = useState<BrandDataObject>(initialBrandData);
  const [current, setCurrent] = useState<Question | null>(null);
  const [value, setValue] = useState<AnswerVal>("");
  const [note, setNote] = useState("");
  const [answered, setAnswered] = useState(initialAnswered);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [showRefs, setShowRefs] = useState(false);

  const { score, missing } = computeCompleteness(bd);
  const refCount = bd.references.length;

  // Keep the live completeness rail in sync when references are uploaded.
  const onRefsChange = (count: number) =>
    setBd((b) => ({ ...b, references: Array.from({ length: count }, () => ({ type: "upload" })) }));

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

  const resetInput = () => {
    setValue("");
    setNote("");
  };

  const loadNext = useCallback(async () => {
    setError(null);
    if (mode === "standard") {
      if (answered >= BANK.length) {
        setDone(true);
        setCurrent(null);
        return;
      }
      setCurrent(BANK[answered]);
      return;
    }
    // AI mode — fetch the next adaptive question from the server.
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
        setCurrent(null);
      } else {
        setCurrent(q);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [mode, answered, projectId]);

  // Generate the first question on mount.
  useEffect(() => {
    if (!current && !done) void loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function persistAnswer(q: Question, ans: AnswerValue, writeBrand: boolean) {
    const supabase = createClient();
    await supabase.from("answers").insert({
      session_id: sessionId,
      project_id: projectId,
      field_path: q.field ?? null,
      section: q.section,
      question: q.question,
      input_type: q.inputType,
      answer: ans as never,
      note: note || null,
      position: answered,
    });

    let nextBd = bd;
    if (writeBrand && q.field && ans != null && ans !== "") {
      nextBd = writeField(bd, q.field, ans);
      const c = computeCompleteness(nextBd);
      nextBd.meta = { ...nextBd.meta, completeness: c.score, requiredMissing: c.missing };
      setBd(nextBd);
      await supabase
        .from("projects")
        .update({
          brand_data: nextBd,
          completeness: c.score,
          status: c.missing.length === 0 ? "ready" : "discovery",
        })
        .eq("id", projectId);
    }
    setAnswered((n) => n + 1);
  }

  async function submit() {
    if (!current) return;
    setBusy(true);
    await persistAnswer(current, value as AnswerValue, true);
    resetInput();
    await loadNext();
    setBusy(false);
  }

  async function skip() {
    if (!current) return;
    setBusy(true);
    await persistAnswer(current, null, false);
    resetInput();
    await loadNext();
    setBusy(false);
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_260px]">
      <div className="space-y-4">
        {error && (
          <div className="card border-red-500/40 text-sm text-red-300">
            <b>Couldn&apos;t generate a question.</b> {error}
            <div className="mt-2 flex gap-2">
              <button className="btn-ghost" onClick={() => void loadNext()}>
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
                    void loadNext();
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
            question={current}
            index={answered}
            value={value}
            onChange={setValue}
            note={note}
            onNote={setNote}
            onSubmit={submit}
            onSkip={skip}
            onRegenerate={mode === "ai" ? () => void loadNext() : undefined}
            busy={busy}
          />
        ) : (
          <div className="card text-ink-3">{busy ? "Generating the first question…" : "Loading…"}</div>
        )}

        {/* Reference upload is reachable any time during the session, not only at the end. */}
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
              onClick={() => {
                setDone(true);
                setCurrent(null);
              }}
            >
              Finish & add references →
            </button>
          </div>
        </div>
      </div>

      <ProgressRail score={score} missing={missing} answered={answered} />
    </div>
  );
}
