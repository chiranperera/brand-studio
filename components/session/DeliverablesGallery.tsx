"use client";

import { useState } from "react";
import { DELIVERABLE_CATEGORIES } from "@/lib/deliverables";
import { Mockup } from "./Mockup";

type Swatch = { hex: string; role: string };

/**
 * Mobile-first deliverables browser:
 *   vertical category accordion → horizontal component tabs → one mockup + desc.
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

  return (
    <div className="space-y-2">
      {DELIVERABLE_CATEGORIES.map((cat) => {
        const open = openCat === cat.id;
        const count = cat.items.filter((i) => selected.includes(i.name)).length;
        const active = cat.items.find((i) => i.name === activeByCat[cat.id]) ?? cat.items[0];
        const activeOn = selected.includes(active.name);

        return (
          <div key={cat.id} className="overflow-hidden rounded-xl border border-line">
            {/* Category header (vertical accordion) */}
            <button
              onClick={() => setOpenCat(open ? "" : cat.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-panel2"
            >
              <span className="font-medium">{cat.label}</span>
              <span className="flex items-center gap-2 text-xs text-ink-3">
                {count > 0 && (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 font-medium text-accent">{count} selected</span>
                )}
                <span className={`transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
              </span>
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

                {/* Active component: description on top + mockup */}
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
                <div className="aspect-[16/10] overflow-hidden rounded-lg border border-line">
                  <Mockup shape={active.shape} palette={palette} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
