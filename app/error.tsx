"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Catches runtime errors in the app tree and shows a friendly, recoverable
 *  page instead of a bare "Internal Server Error". */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaces in the browser console / Vercel logs for debugging.
    console.error("App error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="card w-full max-w-md text-center">
        <div className="mono text-xs uppercase tracking-widest text-ink-3">Discovery Studio</div>
        <h1 className="mt-2 text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-3">
          A page hit an unexpected error. Your saved work is safe — try again, or head back to your projects.
        </p>
        {error?.message && (
          <p className="mono mt-3 max-h-24 overflow-auto rounded-lg border border-line bg-panel2 p-2 text-[11px] text-ink-4">
            {error.message}
          </p>
        )}
        <div className="mt-5 flex justify-center gap-2">
          <button className="btn-ghost" onClick={() => reset()}>
            Try again
          </button>
          <Link className="btn-primary" href="/dashboard">
            Back to projects
          </Link>
        </div>
      </div>
    </main>
  );
}
