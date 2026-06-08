"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { computeCompleteness, emptyBrandData, type BrandDataObject } from "@/lib/brand-data";

interface Asset {
  id: string;
  kind: string;
  source: string | null;
  storage_path: string | null;
  sentiment: string | null;
  note: string | null;
}

const KINDS = ["inspiration", "competitor", "logo", "product", "guidelines"];
const SENTIMENTS = ["love", "like", "avoid"];
const SENT_CLASS: Record<string, string> = {
  love: "text-accent border-accent/40",
  like: "text-ink-2 border-line",
  avoid: "text-red-300 border-red-500/40",
};

export function ReferenceUpload({
  projectId,
  initialAssets,
  onReferencesChange,
  compact = false,
}: {
  projectId: string;
  initialAssets: Asset[];
  /** Notifies a parent (e.g. the session) of the new reference list so its completeness can update live. */
  onReferencesChange?: (count: number) => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [kind, setKind] = useState("inspiration");
  const [sentiment, setSentiment] = useState("love");
  const [note, setNote] = useState("");
  const [staged, setStaged] = useState<File | null>(null); // chosen but not yet uploaded
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /**
   * Keep brand_data.references (and completeness) in sync with the assets table,
   * so the "≥1 reference" requirement is satisfied by an upload.
   */
  async function syncBrandReferences(list: Asset[]) {
    const supabase = createClient();
    const refs = list.map((a) => ({
      type: a.kind,
      source: a.source ?? undefined,
      sentiment: (a.sentiment as "love" | "like" | "avoid" | undefined) ?? undefined,
      note: a.note ?? undefined,
    }));
    const { data } = await supabase.from("projects").select("brand_data").eq("id", projectId).single();
    const raw = (data?.brand_data ?? {}) as BrandDataObject;
    const bd = Object.keys(raw).length ? raw : emptyBrandData();
    bd.references = refs;
    const c = computeCompleteness(bd);
    bd.meta = { ...bd.meta, completeness: c.score, requiredMissing: c.missing };
    await supabase
      .from("projects")
      .update({
        brand_data: bd,
        completeness: c.score,
        status: c.missing.length === 0 ? "ready" : "discovery",
      })
      .eq("id", projectId);
    onReferencesChange?.(refs.length);
  }

  // Commit the staged file together with the type/sentiment/note the user set.
  async function commitUpload() {
    if (!staged) return;
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const safe = staged.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${projectId}/${crypto.randomUUID()}-${safe}`;
    const { error: upErr } = await supabase.storage.from("references").upload(path, staged);
    if (upErr) {
      setErr(upErr.message);
      setBusy(false);
      return;
    }
    const { data, error } = await supabase
      .from("assets")
      .insert({ project_id: projectId, kind, source: "upload", storage_path: path, sentiment, note: note || null })
      .select("id, kind, source, storage_path, sentiment, note")
      .single();
    if (error) setErr(error.message);
    else {
      const next = [data as Asset, ...assets];
      setAssets(next);
      setNote("");
      setStaged(null);
      await syncBrandReferences(next);
      router.refresh();
    }
    setBusy(false);
  }

  async function remove(id: string, storagePath: string | null) {
    const supabase = createClient();
    if (storagePath) await supabase.storage.from("references").remove([storagePath]);
    await supabase.from("assets").delete().eq("id", id);
    const next = assets.filter((x) => x.id !== id);
    setAssets(next);
    await syncBrandReferences(next);
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Type</label>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Sentiment</label>
          <select className="input" value={sentiment} onChange={(e) => setSentiment(e.target.value)}>
            {SENTIMENTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {!compact && (
          <div className="min-w-40 flex-1">
            <label className="label">Note</label>
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={staged ? "Add a note for this image…" : "Why this?"}
            />
          </div>
        )}
        {staged ? (
          <button className="btn-primary" disabled={busy} onClick={() => void commitUpload()}>
            {busy ? "Uploading…" : "Upload"}
          </button>
        ) : (
          <label className="btn-ghost cursor-pointer">
            Choose image
            <input
              type="file"
              accept="image/*,.pdf,.svg"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setStaged(f);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      {/* Show the chosen file so the user can add a note before committing. */}
      {staged && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-accent/40 bg-panel2 px-3 py-2 text-sm">
          <span className="text-ink-2">📎 {staged.name}</span>
          <span className="text-ink-4">— set type/sentiment/note above, then Upload</span>
          <button className="ml-auto text-ink-4 hover:text-red-300" onClick={() => setStaged(null)} disabled={busy}>
            Clear
          </button>
        </div>
      )}
      {err && <p className="mt-2 text-sm text-red-400">{err}</p>}

      {assets.length > 0 && (
        <ul className="mt-4 space-y-2">
          {assets.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-lg border border-line bg-panel2 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className={`rounded-full border px-2 py-0.5 text-xs ${SENT_CLASS[a.sentiment ?? "like"]}`}>
                  {a.sentiment}
                </span>
                <span className="text-ink-2">{a.kind}</span>
                {a.note && <span className="text-ink-4">— {a.note}</span>}
              </div>
              <button className="text-ink-4 hover:text-red-300" onClick={() => remove(a.id, a.storage_path)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
