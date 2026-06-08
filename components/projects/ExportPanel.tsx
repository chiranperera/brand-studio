"use client";

import { useState } from "react";

const PACK_CONTENTS = [
  "README.md — index + instructions for Claude Design",
  "brief.md — the narrative design brief",
  "brand-data.json — the typed source of truth",
  "tokens/brand.tokens.json — DTCG 2025.10 design tokens",
  "references/references.json + image files",
  "deliverables/*.md — one brief per thing to design",
];

export function ExportPanel({
  projectId,
  initialScore,
  initialMissing,
}: {
  projectId: string;
  initialScore: number;
  initialMissing: string[];
}) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>(initialMissing);
  const [needsOverride, setNeedsOverride] = useState(false);

  async function run(override = false) {
    setBusy(true);
    setError(null);
    setUrl(null);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, override }),
      });
      const json = await res.json();
      if (res.status === 422 && json.error === "incomplete") {
        setMissing(json.missing ?? []);
        setNeedsOverride(true);
        return;
      }
      if (!res.ok) throw new Error(json.error || "Export failed.");
      setUrl(json.url);
      setNeedsOverride(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <span className="label mb-0">Completeness</span>
          <span className="mono text-lg font-semibold">{initialScore}%</span>
        </div>
        {missing.length > 0 ? (
          <p className="text-sm text-ink-3">
            Missing: <span className="text-ink-2">{missing.join(" · ")}</span>
          </p>
        ) : (
          <p className="text-sm text-accent">All required fields captured ✓</p>
        )}
      </div>

      <div className="card">
        <span className="label">The pack contains</span>
        <ul className="space-y-1.5 text-sm text-ink-2">
          {PACK_CONTENTS.map((c) => (
            <li key={c} className="flex gap-2">
              <span className="text-ink-4">·</span>
              {c}
            </li>
          ))}
        </ul>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {url ? (
        <div className="card border-accent/40 text-center">
          <p className="mb-3 text-sm text-ink-2">Your Design Pack is ready.</p>
          <a className="btn-primary" href={url} download>
            Download zip
          </a>
          <p className="mt-2 text-xs text-ink-4">Signed link valid for 1 hour.</p>
        </div>
      ) : needsOverride ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink-3">
            Some required fields are missing. You can finish the session, or export anyway with an override.
          </p>
          <div className="flex gap-2">
            <button className="btn-ghost" disabled={busy} onClick={() => run(true)}>
              {busy ? "Building…" : "Export anyway"}
            </button>
          </div>
        </div>
      ) : (
        <button className="btn-primary w-full" disabled={busy} onClick={() => run(false)}>
          {busy ? "Building Design Pack…" : "Generate Design Pack"}
        </button>
      )}
    </div>
  );
}
