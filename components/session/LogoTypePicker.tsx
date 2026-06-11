"use client";

import { LOGO_TYPES } from "@/lib/logo-types";
import type { LogoType } from "@/lib/brand-data";

export function LogoTypePicker({
  selected,
  onChange,
  onComplete,
  onBack,
  busy,
  page,
  setPage,
}: {
  selected: LogoType[];
  onChange: (next: LogoType[]) => void;
  onComplete: () => void;
  onBack: () => void;
  busy: boolean;
  page: number; // controlled by parent so it can be broadcast live
  setPage: (p: number) => void;
}) {
  const info = LOGO_TYPES[page];
  const isSelected = selected.includes(info.slug);

  function toggle() {
    onChange(isSelected ? selected.filter((s) => s !== info.slug) : [...selected, info.slug]);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <div className="mono text-xs uppercase tracking-widest text-ink-3">
          Logo type {page + 1} of {LOGO_TYPES.length}
        </div>
        <h1 className="mt-2 text-3xl font-semibold">{info.plain}</h1>
        <p className="mono mt-1 text-sm text-ink-3">{info.name}</p>
      </div>

      {/* dots */}
      <div className="flex justify-center gap-1.5">
        {LOGO_TYPES.map((t, i) => (
          <button
            key={t.slug}
            onClick={() => setPage(i)}
            aria-label={`Go to ${t.name}`}
            className={`h-1.5 rounded-full transition-all ${
              i === page ? "w-6 bg-accent" : selected.includes(t.slug) ? "w-1.5 bg-accent/60" : "w-1.5 bg-line"
            }`}
          />
        ))}
      </div>

      <div className="card space-y-6">
        <div>
          <p className="text-ink-2">{info.summary}</p>
          <p className="mt-3 text-sm text-ink-3">
            <span className="font-medium text-ink-2">Best for:</span> {info.bestFor}
          </p>
        </div>

        <div>
          <span className="label">Example logos</span>
          <div className="grid grid-cols-3 gap-3">
            {info.examples.map((e) => (
              <figure key={e.brand}>
                <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-line bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={e.logo} alt={`${e.brand} logo`} className="h-full w-full object-contain p-3" />
                </div>
                <figcaption className="mt-1 text-center text-xs text-ink-3">{e.brand}</figcaption>
              </figure>
            ))}
          </div>
        </div>

        <div>
          <span className="label">In real use</span>
          <div className="grid grid-cols-3 gap-3">
            {info.examples.map((e) => (
              <div key={e.brand} className="aspect-[4/3] overflow-hidden rounded-lg border border-line bg-panel2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.mockup} alt={`${e.brand} logo in use`} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={toggle}
          className={`w-full rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
            isSelected ? "border-accent bg-accent/10 text-ink" : "border-line text-ink-2 hover:border-ink-3"
          }`}
        >
          {isSelected ? `✓ Selected — ${info.plain}` : `Select this logo type — ${info.plain}`}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <button className="btn-ghost" onClick={() => (page === 0 ? onBack() : setPage(page - 1))} disabled={busy}>
          ← {page === 0 ? "Back to questions" : "Previous"}
        </button>

        <div className="text-sm text-ink-3">
          {selected.length === 0
            ? "Pick the 1–2 that fit the brand"
            : `Selected: ${selected.map((s) => LOGO_TYPES.find((t) => t.slug === s)?.plain).join(", ")}`}
        </div>

        {page < LOGO_TYPES.length - 1 ? (
          <button className="btn-ghost" onClick={() => setPage(page + 1)} disabled={busy}>
            Next →
          </button>
        ) : (
          <button className="btn-primary" onClick={onComplete} disabled={busy || selected.length === 0}>
            {busy ? "Saving…" : "Use selected →"}
          </button>
        )}
      </div>

      {selected.length > 0 && page < LOGO_TYPES.length - 1 && (
        <div className="text-center">
          <button className="btn-primary" onClick={onComplete} disabled={busy}>
            {busy ? "Saving…" : "Done — use selected types →"}
          </button>
        </div>
      )}
    </div>
  );
}
