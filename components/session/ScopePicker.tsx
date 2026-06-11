"use client";

import { useEffect, useRef, useState } from "react";
import {
  SURFACE_KINDS,
  WEBSITE_SECTIONS,
  WEBSITE_FEATURES,
  AUTOMATION_NEEDS,
  AUTOMATION_LEVELS,
  DELIVERABLE_GROUPS,
} from "@/lib/scope-options";

export interface ScopeData {
  kinds: string[];
  sections: string[];
  features: string[];
  needs: string[];
  deliverables: string[];
  level: string;
  workflows: string;
  notes: string;
}

type ScopeListKey = "kinds" | "sections" | "features" | "needs" | "deliverables";

function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (o: string) => void;
}) {
  const [custom, setCustom] = useState("");
  // Show preset options plus any custom values the host added (selected but not
  // in the preset list), so custom tags render as chips and can be toggled off.
  const all = [...options, ...selected.filter((s) => !options.includes(s))];

  function add() {
    const v = custom.trim();
    if (v && !selected.includes(v)) onToggle(v);
    setCustom("");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {all.map((o) => (
          <button
            key={o}
            type="button"
            className={`chip ${selected.includes(o) ? "chip-on" : ""}`}
            onClick={() => onToggle(o)}
          >
            {o}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input text-sm"
          placeholder="Add your own…"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn-ghost shrink-0" onClick={add}>
          Add
        </button>
      </div>
    </div>
  );
}

export function ScopePicker({
  data,
  onChange,
  projectId,
  onComplete,
  onBack,
  busy,
}: {
  data: ScopeData; // controlled by parent so it can be broadcast live
  onChange: (d: ScopeData) => void;
  projectId: string;
  onComplete: (d: ScopeData) => void;
  onBack: () => void;
  busy: boolean;
}) {
  // Controlled: mirror the parent's data via a setState-style shim so the rest
  // of the render can keep using d/setD.
  const d = data;
  const setD = (u: ScopeData | ((s: ScopeData) => ScopeData)) =>
    onChange(typeof u === "function" ? (u as (s: ScopeData) => ScopeData)(data) : u);
  const [suggesting, setSuggesting] = useState(false);
  const [suggested, setSuggested] = useState(false);
  const fetched = useRef(false);
  const toggle = (key: ScopeListKey) => (o: string) =>
    setD((s) => ({ ...s, [key]: s[key].includes(o) ? s[key].filter((x) => x !== o) : [...s[key], o] }));

  async function suggest() {
    setSuggesting(true);
    try {
      const res = await fetch("/api/scope-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const s = await res.json();
      if (res.ok) {
        // Pre-select suggestions; keep any free-text the host already wrote.
        setD((prev) => ({
          ...prev,
          kinds: s.kinds ?? prev.kinds,
          sections: s.sections ?? prev.sections,
          features: s.features ?? prev.features,
          needs: s.needs ?? prev.needs,
          deliverables: s.deliverables ?? prev.deliverables,
          level: s.level ?? prev.level,
        }));
        setSuggested(true);
      }
    } catch {
      /* leave as-is on failure */
    } finally {
      setSuggesting(false);
    }
  }

  // Auto-suggest on first entry when nothing is selected yet (smart defaults).
  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    const empty = !data.kinds.length && !data.sections.length && !data.features.length && !data.needs.length;
    if (empty) void suggest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canContinue = d.kinds.length > 0 && d.needs.length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <div className="mono text-xs uppercase tracking-widest text-ink-3">Scope &amp; build requirements</div>
        <h1 className="mt-2 text-3xl font-semibold">What are we building?</h1>
        <p className="mt-1 text-sm text-ink-3">
          The functional brief — the pages, features and AI automation to build. This is what Claude Design &amp; Claude
          Code work from.
        </p>
        <div className="mt-3 flex items-center justify-center gap-3">
          {suggesting ? (
            <span className="text-sm text-ink-3">✨ Suggesting smart defaults for this industry…</span>
          ) : (
            <>
              {suggested && <span className="text-sm text-accent">✨ Pre-filled for this industry — adjust as needed</span>}
              <button className="btn-ghost" onClick={() => void suggest()} disabled={busy}>
                ↻ {suggested ? "Re-suggest" : "Suggest from industry"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card space-y-4">
        <div>
          <span className="label">What are we building? (pick all that apply)</span>
          <ChipGroup options={SURFACE_KINDS} selected={d.kinds} onToggle={toggle("kinds")} />
        </div>
        <div>
          <span className="label">Which sections / pages?</span>
          <ChipGroup options={WEBSITE_SECTIONS} selected={d.sections} onToggle={toggle("sections")} />
        </div>
        <div>
          <span className="label">Features &amp; functionality</span>
          <ChipGroup options={WEBSITE_FEATURES} selected={d.features} onToggle={toggle("features")} />
        </div>
      </div>

      <div className="card space-y-4">
        <div>
          <h2 className="font-medium">AI automation</h2>
          <p className="text-sm text-ink-3">Where should AI take work off their plate? Automate these jobs first.</p>
        </div>
        <div>
          <span className="label">What should the automation do? (pick all that apply)</span>
          <ChipGroup options={AUTOMATION_NEEDS} selected={d.needs} onToggle={toggle("needs")} />
        </div>
        <div>
          <span className="label">How much automation?</span>
          <div className="space-y-2">
            {AUTOMATION_LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setD((s) => ({ ...s, level: l }))}
                className={`block w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  d.level === l ? "border-accent bg-accent/10 text-ink" : "border-line text-ink-2 hover:border-ink-3"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Biggest time-sinks to automate (one per line)</span>
          <textarea
            className="input min-h-20"
            placeholder="e.g. answering the same booking questions all day&#10;chasing quotes and follow-ups"
            value={d.workflows}
            onChange={(e) => setD((s) => ({ ...s, workflows: e.target.value }))}
          />
        </div>
        <div>
          <span className="label">Anything else about scope?</span>
          <input
            className="input"
            value={d.notes}
            onChange={(e) => setD((s) => ({ ...s, notes: e.target.value }))}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="card space-y-4">
        <div>
          <h2 className="font-medium">What can we design &amp; deliver for you?</h2>
          <p className="text-sm text-ink-3">
            Everything we can design (we don&apos;t print, but we deliver print-ready files). Pick anything the client
            might want.
          </p>
        </div>
        {DELIVERABLE_GROUPS.map((g) => (
          <div key={g.label}>
            <span className="label">{g.label}</span>
            <ChipGroup options={g.options} selected={d.deliverables} onToggle={toggle("deliverables")} />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button className="btn-ghost" onClick={onBack} disabled={busy}>
          ← Back to questions
        </button>
        <span className="text-sm text-ink-3">
          {canContinue ? `${d.kinds.length} surface(s) · ${d.needs.length} automation(s)` : "Pick what to build + ≥1 automation"}
        </span>
        <button className="btn-primary" onClick={() => onComplete(d)} disabled={busy || !canContinue}>
          {busy ? "Saving…" : "Save & continue →"}
        </button>
      </div>
    </div>
  );
}
