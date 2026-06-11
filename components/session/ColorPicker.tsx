"use client";

import { useEffect, useRef, useState } from "react";
import { PALETTES, type PaletteRole } from "@/lib/color-palettes";

export type Swatch = { hex: string; role: PaletteRole };
type Pal = { name: string; mood: string; colors: Swatch[] };

const keyOf = (colors: Swatch[]) => colors.map((c) => c.hex.toUpperCase()).join(",");

function PaletteCard({ p, active, onPick }: { p: Pal; active: boolean; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      className={`card text-left transition-colors ${active ? "border-accent ring-1 ring-accent" : "hover:border-ink-3"}`}
    >
      <div className="flex h-14 overflow-hidden rounded-lg">
        {p.colors.map((c, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: c.hex }} title={`${c.hex} · ${c.role}`} />
        ))}
      </div>
      <div className="mt-2">
        <div className="text-sm font-medium">{p.name}</div>
        {p.mood && <div className="text-xs text-ink-3">{p.mood}</div>}
      </div>
    </button>
  );
}

export function ColorPicker({
  colors,
  onChange,
  projectId,
  onComplete,
  onBack,
  busy,
}: {
  colors: Swatch[];
  onChange: (colors: Swatch[]) => void;
  projectId: string;
  onComplete: () => void;
  onBack: () => void;
  busy: boolean;
}) {
  const [suggestions, setSuggestions] = useState<Pal[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const fetched = useRef(false);

  async function suggest() {
    setSuggesting(true);
    try {
      const res = await fetch("/api/color-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json.palettes)) setSuggestions(json.palettes);
    } catch {
      /* ignore */
    } finally {
      setSuggesting(false);
    }
  }

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    void suggest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeKey = keyOf(colors);
  const setAt = (i: number, hex: string) =>
    onChange(colors.map((c, idx) => (idx === i ? { ...c, hex } : c)));
  const removeAt = (i: number) => onChange(colors.filter((_, idx) => idx !== i));
  const addColor = () => onChange([...colors, { hex: "#888888", role: "accent" }]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <div className="mono text-xs uppercase tracking-widest text-ink-3">Colour direction</div>
        <h1 className="mt-2 text-3xl font-semibold">Pick a palette — then make it yours</h1>
        <p className="mt-1 text-sm text-ink-3">Start from a suggestion, then tweak any colour to taste.</p>
        <div className="mt-3">
          {suggesting ? (
            <span className="text-sm text-ink-3">✨ Suggesting palettes for this industry…</span>
          ) : (
            <button className="btn-ghost" onClick={() => void suggest()} disabled={busy}>
              ↻ Re-suggest
            </button>
          )}
        </div>
      </div>

      {suggestions.length > 0 && (
        <div>
          <span className="label">Suggested for this brand</span>
          <div className="grid gap-3 sm:grid-cols-2">
            {suggestions.map((p, i) => (
              <PaletteCard key={`s${i}`} p={p} active={keyOf(p.colors) === activeKey} onPick={() => onChange(p.colors)} />
            ))}
          </div>
        </div>
      )}

      <div>
        <span className="label">Or start from a preset</span>
        <div className="grid gap-3 sm:grid-cols-2">
          {PALETTES.map((p) => (
            <PaletteCard key={p.id} p={p} active={keyOf(p.colors) === activeKey} onPick={() => onChange(p.colors)} />
          ))}
        </div>
      </div>

      {colors.length > 0 && (
        <div className="card">
          <span className="label">Edit your palette</span>
          <div className="space-y-2">
            {colors.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(c.hex) ? c.hex : "#888888"}
                  onChange={(e) => setAt(i, e.target.value.toUpperCase())}
                  className="h-9 w-12 cursor-pointer rounded border border-line bg-transparent p-0.5"
                  aria-label={`${c.role} colour`}
                />
                <input
                  className="input w-32 font-mono text-sm"
                  value={c.hex}
                  onChange={(e) => setAt(i, e.target.value)}
                />
                <span className="text-xs capitalize text-ink-3">{c.role}</span>
                <button className="ml-auto text-ink-4 hover:text-red-300" onClick={() => removeAt(i)} aria-label="Remove">
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button className="btn-ghost mt-3 text-xs" onClick={addColor}>
            + Add colour
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button className="btn-ghost" onClick={onBack} disabled={busy}>
          ← Back
        </button>
        <span className="text-sm text-ink-3">{colors.length ? `${colors.length} colours` : "Pick a palette to start"}</span>
        <button className="btn-primary" onClick={onComplete} disabled={busy || colors.length === 0}>
          {busy ? "Saving…" : "Use this palette →"}
        </button>
      </div>
    </div>
  );
}
