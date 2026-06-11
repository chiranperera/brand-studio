"use client";

import { PALETTES } from "@/lib/color-palettes";

export function ColorPicker({
  selected,
  onChange,
  onComplete,
  onBack,
  busy,
}: {
  selected: string | null;
  onChange: (id: string) => void;
  onComplete: () => void;
  onBack: () => void;
  busy: boolean;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <div className="mono text-xs uppercase tracking-widest text-ink-3">Colour direction</div>
        <h1 className="mt-2 text-3xl font-semibold">Which palette feels right?</h1>
        <p className="mt-1 text-sm text-ink-3">Tap the one that fits the brand. You can change it anytime.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {PALETTES.map((p) => {
          const on = selected === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onChange(p.id)}
              className={`card text-left transition-colors ${on ? "border-accent ring-1 ring-accent" : "hover:border-ink-3"}`}
            >
              <div className="flex h-16 overflow-hidden rounded-lg">
                {p.colors.map((c) => (
                  <div key={c.hex} className="flex-1" style={{ backgroundColor: c.hex }} title={`${c.hex} · ${c.role}`} />
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-ink-3">{p.mood}</div>
                </div>
                {on && <span className="text-sm text-accent">✓ Selected</span>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <button className="btn-ghost" onClick={onBack} disabled={busy}>
          ← Back
        </button>
        <span className="text-sm text-ink-3">{selected ? "Palette chosen" : "Pick the one that fits"}</span>
        <button className="btn-primary" onClick={onComplete} disabled={busy || !selected}>
          {busy ? "Saving…" : "Use this palette →"}
        </button>
      </div>
    </div>
  );
}
