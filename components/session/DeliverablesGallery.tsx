"use client";

import { useState } from "react";
import { DELIVERABLE_CATEGORIES, type Deliverable } from "@/lib/deliverables";
import { Mockup } from "./Mockup";

type Swatch = { hex: string; role: string };

/**
 * Mobile-first deliverables browser:
 *   vertical category tabs (one always open) → horizontal component tabs →
 *   description + Select + a fixed-size mockup that opens full-screen on tap.
 */
export function DeliverablesGallery({
  selected,
  onToggle,
  palette,
}: {
  selected: string[];
  onToggle: (name: string) => void;
  palette?: Swatch[];
}) {
  const [openCat, setOpenCat] = useState<string>(DELIVERABLE_CATEGORIES[0].id);
  const [activeByCat, setActiveByCat] = useState<Record<string, string>>(() =>
    Object.fromEntries(DELIVERABLE_CATEGORIES.map((c) => [c.id, c.items[0].name]))
  );
  const [zoom, setZoom] = useState<Deliverable | null>(null);

  return (
    <>
      <div className="space-y-2">
        {DELIVERABLE_CATEGORIES.map((cat) => {
          const open = openCat === cat.id;
          const count = cat.items.filter((i) => selected.includes(i.name)).length;
          const active = cat.items.find((i) => i.name === activeByCat[cat.id]) ?? cat.items[0];
          const activeOn = selected.includes(active.name);

          return (
            <div
              key={cat.id}
              className={`overflow-hidden rounded-xl border ${open ? "border-accent/50" : "border-line"}`}
            >
              {/* Category tab (vertical list — one always open) */}
              <button
                onClick={() => setOpenCat(cat.id)}
                className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                  open ? "bg-accent/5" : "hover:bg-panel2"
                }`}
              >
                <span className={`font-medium ${open ? "text-accent" : ""}`}>{cat.label}</span>
                {count > 0 && (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                    {count} selected
                  </span>
                )}
              </button>

              {open && (
                <div className="border-t border-line p-3">
                  {/* Component tabs (horizontal scroll) */}
                  <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
                    {cat.items.map((item) => {
                      const on = selected.includes(item.name);
                      const isActive = item.name === active.name;
                      return (
                        <button
                          key={item.name}
                          onClick={() => setActiveByCat((s) => ({ ...s, [cat.id]: item.name }))}
                          className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                            isActive ? "border-ink-3 bg-panel2 text-ink" : "border-line text-ink-3 hover:text-ink"
                          } ${on ? "ring-1 ring-accent" : ""}`}
                        >
                          {on && <span className="text-accent">✓ </span>}
                          {item.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Active component: description + Select + fixed-size mockup */}
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium leading-tight">{active.name}</h3>
                      <p className="text-sm text-ink-3">{active.desc}</p>
                    </div>
                    <button
                      onClick={() => onToggle(active.name)}
                      className={`shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        activeOn ? "border-accent bg-accent/10 text-ink" : "border-line text-ink-2 hover:border-ink-3"
                      }`}
                    >
                      {activeOn ? "✓ Selected" : "Select"}
                    </button>
                  </div>

                  {/* Fixed, consistent mockup preview — tap to enlarge */}
                  <button
                    onClick={() => setZoom(active)}
                    className="group relative mx-auto block aspect-[16/10] w-full max-w-md overflow-hidden rounded-lg border border-line"
                    title="Tap to enlarge"
                  >
                    <Mockup shape={active.shape} palette={palette} />
                    <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                      ⤢ Enlarge
                    </span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Full-screen overlay */}
      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setZoom(null)}
        >
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{zoom.name}</h3>
                <p className="text-sm text-white/70">{zoom.desc}</p>
              </div>
              <button
                onClick={() => setZoom(null)}
                className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/25"
              >
                ✕ Close
              </button>
            </div>
            <div className="aspect-[4/3] overflow-hidden rounded-xl">
              <Mockup shape={zoom.shape} palette={palette} />
            </div>
            <div className="mt-3 flex justify-center">
              <button
                onClick={() => {
                  onToggle(zoom.name);
                }}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                  selected.includes(zoom.name)
                    ? "border-accent bg-accent text-onAccent"
                    : "border-white/30 text-white hover:bg-white/10"
                }`}
              >
                {selected.includes(zoom.name) ? "✓ Selected" : "Select this"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
