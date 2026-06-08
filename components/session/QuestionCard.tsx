"use client";

import type { Question } from "@/lib/question-engine";
import { InputArea, type AnswerVal } from "./InputArea";

export function QuestionCard({
  question,
  index,
  value,
  onChange,
  note,
  onNote,
  onSubmit,
  onSkip,
  onRegenerate,
  busy,
}: {
  question: Question;
  index: number;
  value: AnswerVal;
  onChange: (v: AnswerVal) => void;
  note: string;
  onNote: (s: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  onRegenerate?: () => void;
  busy: boolean;
}) {
  const empty =
    value === "" ||
    value == null ||
    (Array.isArray(value) && value.length === 0);

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <span className="mono text-xs uppercase tracking-wide text-ink-3">
          {question.section || "Discovery"}
        </span>
        <span className="mono text-xs text-ink-4">Q{index + 1}</span>
      </div>

      <h2 className="text-xl font-medium">{question.question}</h2>
      {question.help && <p className="mt-1 text-sm text-ink-4">{question.help}</p>}
      {question.field && (
        <p className="mono mt-1 text-[11px] text-ink-4">→ {question.field}</p>
      )}

      {/* Freeze the answer area while the next question is generating, so
          mid-generation clicks can't land on a question that's about to change. */}
      <div className={`mt-5 transition-opacity ${busy ? "pointer-events-none select-none opacity-40" : ""}`} aria-disabled={busy}>
        <InputArea question={question} value={value} onChange={onChange} />
        <div className="mt-4">
          <input
            className="input text-sm"
            placeholder="Optional note…"
            value={note}
            onChange={(e) => onNote(e.target.value)}
            disabled={busy}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={onSkip} disabled={busy}>
            Skip
          </button>
          {onRegenerate && (
            <button className="btn-ghost" onClick={onRegenerate} disabled={busy}>
              ↻ Regenerate
            </button>
          )}
        </div>
        <button className="btn-primary" onClick={onSubmit} disabled={busy || empty}>
          {busy ? "Generating…" : "Next"}
        </button>
      </div>
    </div>
  );
}
