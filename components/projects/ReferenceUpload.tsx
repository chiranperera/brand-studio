"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

export function ReferenceUpload({ projectId, initialAssets }: { projectId: string; initialAssets: Asset[] }) {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [kind, setKind] = useState("inspiration");
  const [sentiment, setSentiment] = useState("love");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${projectId}/${crypto.randomUUID()}-${safe}`;
    const { error: upErr } = await supabase.storage.from("references").upload(path, file);
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
      setAssets((a) => [data as Asset, ...a]);
      setNote("");
      router.refresh();
    }
    setBusy(false);
  }

  async function remove(id: string, storagePath: string | null) {
    const supabase = createClient();
    if (storagePath) await supabase.storage.from("references").remove([storagePath]);
    await supabase.from("assets").delete().eq("id", id);
    setAssets((a) => a.filter((x) => x.id !== id));
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
        <div className="min-w-40 flex-1">
          <label className="label">Note</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why this?" />
        </div>
        <label className="btn-primary cursor-pointer">
          {busy ? "Uploading…" : "Upload file"}
          <input
            type="file"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
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
