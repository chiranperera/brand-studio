"use client";

import { TYPE_FEELS, type TypeFeel } from "@/lib/type-specimens";

function SpecimenCard({
  feel,
  active,
  onPick,
  size,
}: {
  feel: TypeFeel;
  active: boolean;
  onPick: () => void;
  size: "lg" | "sm";
}) {
  return (
    <button
      onClick={onPick}
      className={`card text-left transition-colors ${active ? "border-accent ring-1 ring-accent" : "hover:border-ink-3"}`}
    >
      <div
        className="truncate leading-none text-ink"
        style={{ fontFamily: feel.font, fontSize: size === "lg" ? "2.4rem" : "1.5rem" }}
      >
        {size === "lg" ? "Ag" : "Aa"}
      </div>
      <div className="mt-2 truncate text-ink-2" style={{ fontFamily: feel.font }}>
        {feel.sample}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{feel.name}</div>
          <div className="text-xs text-ink-3">{feel.desc}</div>
        </div>
        {active && <span className="text-sm text-accent">✓</span>}
      </div>
    </button>
  );
}

export function TypePicker({
  display,
  body,
  onDisplay,
  onBody,
  onComplete,
  onBack,
  busy,
}: {
  display: string;
  body: string;
  onDisplay: (name: string) => void;
  onBody: (name: string) => void;
  onComplete: () => void;
  onBack: () => void;
  busy: boolean;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <div className="mono text-xs uppercase tracking-widest text-ink-3">Typography</div>
        <h1 className="mt-2 text-3xl font-semibold">Which type personality fits?</h1>
        <p className="mt-1 text-sm text-ink-3">Pick the feel — no font names. We map it to real fonts later.</p>
      </div>

      <div>
        <span className="label">Headlines</span>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TYPE_FEELS.map((f) => (
            <SpecimenCard key={f.id} feel={f} active={display === f.name} onPick={() => onDisplay(f.name)} size="lg" />
          ))}
        </div>
      </div>

      <div>
        <span className="label">Body text (optional)</span>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TYPE_FEELS.map((f) => (
            <SpecimenCard key={f.id} feel={f} active={body === f.name} onPick={() => onBody(f.name)} size="sm" />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button className="btn-ghost" onClick={onBack} disabled={busy}>
          ← Back
        </button>
        <span className="text-sm text-ink-3">{display ? "Headline type chosen" : "Pick a headline feel"}</span>
        <button className="btn-primary" onClick={onComplete} disabled={busy || !display}>
          {busy ? "Saving…" : "Use this type →"}
        </button>
      </div>
    </div>
  );
}
