"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ProjectRow {
  id: string;
  client_name: string;
  industry: string | null;
  status: string;
  completeness: number;
  updated_at: string;
}

function badge(completeness: number, status: string) {
  if (completeness >= 100 || status === "exported") {
    return { label: status === "exported" ? "Exported" : "Complete", cls: "border-accent/50 text-accent" };
  }
  return { label: "Draft", cls: "border-line text-ink-3" };
}

export function ProjectCard({ p }: { p: ProjectRow }) {
  const router = useRouter();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Close the menu on any outside click, scroll, or Escape.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  async function del() {
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const { error } = await supabase.from("projects").delete().eq("id", p.id);
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    setConfirming(false);
    setBusy(false);
    router.refresh();
  }

  const b = badge(p.completeness, p.status);
  const item = "block w-full px-3 py-2 text-left text-sm hover:bg-panel2";

  return (
    <>
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          // keep the menu inside the viewport
          const x = Math.min(e.clientX, window.innerWidth - 200);
          const y = Math.min(e.clientY, window.innerHeight - 200);
          setMenu({ x, y });
        }}
      >
        <Link href={`/projects/${p.id}`} className="card block transition-colors hover:border-ink-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-medium">{p.client_name}</div>
              <div className="text-sm text-ink-3">{p.industry || "—"}</div>
            </div>
            <span className="mono text-xs text-ink-3">{p.completeness}%</span>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className={`rounded-full border px-2 py-0.5 font-medium ${b.cls}`}>{b.label}</span>
            <span className="text-ink-4">{new Date(p.updated_at).toLocaleDateString()}</span>
          </div>
        </Link>
      </div>

      {menu && (
        <div
          className="fixed z-50 w-48 overflow-hidden rounded-lg border border-line bg-panel py-1 shadow-xl"
          style={{ top: menu.y, left: menu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-xs text-ink-4">{p.client_name}</div>
          <button className={item} onClick={() => router.push(`/projects/${p.id}`)}>
            Open
          </button>
          <button className={item} onClick={() => router.push(`/projects/${p.id}/session`)}>
            Resume session
          </button>
          <button className={item} onClick={() => router.push(`/projects/${p.id}/export`)}>
            Export Design Pack
          </button>
          <div className="my-1 border-t border-line" />
          <button
            className={`${item} text-red-400 hover:bg-red-500/10`}
            onClick={() => {
              setMenu(null);
              setConfirming(true);
            }}
          >
            Delete project
          </button>
        </div>
      )}

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
          onClick={() => !busy && setConfirming(false)}
        >
          <div className="card w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Delete “{p.client_name}”?</h2>
            <p className="mt-2 text-sm text-ink-3">
              This permanently removes the project and everything in it — answers, scope, logo choice, references and
              exports. This can&apos;t be undone.
            </p>
            {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>
                Cancel
              </button>
              <button
                className="btn inline-flex items-center justify-center rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
                onClick={del}
                disabled={busy}
              >
                {busy ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
