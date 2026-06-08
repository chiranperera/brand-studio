"use client";

export function ProgressRail({
  score,
  missing,
  answered,
}: {
  score: number;
  missing: string[];
  answered: number;
}) {
  return (
    <aside className="card sticky top-20 h-fit">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="label mb-0">Completeness</span>
        <span className="mono text-lg font-semibold text-ink">{score}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel2">
        <div className="h-full bg-accent transition-all" style={{ width: `${score}%` }} />
      </div>
      <p className="mt-2 text-xs text-ink-4">{answered} answered</p>

      <div className="mt-5">
        <span className="label">Still needed</span>
        {missing.length === 0 ? (
          <p className="text-sm text-accent">All required fields captured ✓</p>
        ) : (
          <ul className="space-y-1.5 text-sm text-ink-3">
            {missing.map((m) => (
              <li key={m} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-ink-4" />
                {m}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
