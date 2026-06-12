"use client";

import { useState } from "react";
import { DELIVERABLE_CATEGORIES } from "@/lib/deliverables";
import { Mockup } from "./Mockup";

type Swatch = { hex: string; role: string };

/** Tabbed, visual deliverables menu — each item shows a stylised on-brand mockup. */
export function DeliverablesGallery({
  selected,
  onToggle,
  palette,
}: {
  selected: string[];
  onToggle: (name: string) => void;
  palette?: Swatch[];
}) {
  const [tab, setTab] = useState(DELIVERABLE_CATEGORIES[0].id);
  const cat = DELIVERABLE_CATEGORIES.find((c) => c.id === tab) ?? DELIVERABLE_CATEGORIES[0];

  return (
    <div>
      {/* Category tabs */}
      <div className="-mx-1 mb-4 flex gap-1 overflow-x-auto pb-1">
        {DELIVERABLE_CATEGORIES.map((c) => {
          const count = c.items.filter((i) => selected.includes(i.name)).length;
          const active = c.id === tab;
          return (
            <button
              key={c.id}
              onClick={() => setTab(c.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                active ? "border-accent bg-accent/10 text-ink" : "border-line text-ink-3 hover:text-ink"
              }`}
            >
              {c.label}
              {count > 0 && <span className="ml-1.5 text-xs text-accent">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Cards with mockups */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cat.items.map((item) => {
          const on = selected.includes(item.name);
          return (
            <button
              key={item.name}
              onClick={() => onToggle(item.name)}
              className={`card text-left transition-colors ${on ? "border-accent ring-1 ring-accent" : "hover:border-ink-3"}`}
            >
              <div className="aspect-[4/3] overflow-hidden rounded-md border border-line">
                <Mockup shape={item.shape} palette={palette} />
              </div>
              <div className="mt-2 flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium leading-tight">{item.name}</div>
                  <div className="text-xs text-ink-3">{item.desc}</div>
                </div>
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                    on ? "border-accent bg-accent text-onAccent" : "border-line"
                  }`}
                >
                  {on ? "✓" : ""}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
