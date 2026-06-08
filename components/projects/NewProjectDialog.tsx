"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { emptyBrandData } from "@/lib/brand-data";

export function NewProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ client: "", contact: "", email: "", industry: "", mode: "ai" });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErr("Not signed in.");
      setBusy(false);
      return;
    }

    const brand = emptyBrandData({
      client: form.client,
      contact: form.contact || undefined,
      clientEmail: form.email || undefined,
      industry: form.industry || undefined,
    });

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        owner_id: user.id,
        client_name: form.client,
        contact_name: form.contact || null,
        client_email: form.email || null,
        industry: form.industry || null,
        brand_data: brand,
      })
      .select("id")
      .single();

    if (error || !project) {
      setErr(error?.message ?? "Could not create project.");
      setBusy(false);
      return;
    }

    // Open a session for it (Phase 1: one session per project).
    await supabase.from("sessions").insert({ project_id: project.id, mode: form.mode });

    router.push(`/projects/${project.id}/session`);
    router.refresh();
  }

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        New project
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-6" onClick={() => setOpen(false)}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={create}
        className="card w-full max-w-md space-y-4"
      >
        <h2 className="text-lg font-semibold">New project</h2>
        <div>
          <label className="label">Client / business name</label>
          <input className="input" required value={form.client} onChange={(e) => set("client", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Contact name</label>
            <input className="input" value={form.contact} onChange={(e) => set("contact", e.target.value)} />
          </div>
          <div>
            <label className="label">Industry</label>
            <input className="input" value={form.industry} onChange={(e) => set("industry", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Client email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <label className="label">Mode</label>
          <select className="input" value={form.mode} onChange={(e) => set("mode", e.target.value)}>
            <option value="ai">Adaptive AI (Gemini)</option>
            <option value="standard">Standard question bank</option>
          </select>
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button className="btn-primary" disabled={busy}>
            {busy ? "Creating…" : "Create & start"}
          </button>
        </div>
      </form>
    </div>
  );
}
