import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emptyBrandData, withAssetReferences, type BrandDataObject } from "@/lib/brand-data";
import { SessionFlow } from "@/components/session/SessionFlow";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, client_name, brand_data")
    .eq("id", id)
    .single();
  if (!project) redirect("/dashboard");

  // Ensure a session exists (created with the project, but be defensive).
  let { data: session } = await supabase
    .from("sessions")
    .select("id, mode")
    .eq("project_id", id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!session) {
    const { data: created } = await supabase
      .from("sessions")
      .insert({ project_id: id, mode: "ai" })
      .select("id, mode")
      .single();
    session = created!;
  }

  const { count } = await supabase
    .from("answers")
    .select("id", { count: "exact", head: true })
    .eq("project_id", id);

  const { data: assets } = await supabase
    .from("assets")
    .select("id, kind, source, storage_path, sentiment, note")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const raw = (project.brand_data ?? {}) as BrandDataObject;
  const bd = withAssetReferences(
    Object.keys(raw).length ? raw : emptyBrandData({ id, client: project.client_name }),
    assets
  );

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">{project.client_name}</h1>
      <p className="mb-6 text-sm text-ink-3">
        Discovery session · {session.mode === "ai" ? "Adaptive AI" : "Standard"} mode
      </p>
      <SessionFlow
        projectId={id}
        sessionId={session.id}
        mode={(session.mode as "ai" | "standard") ?? "ai"}
        initialBrandData={bd}
        initialAnswered={count ?? 0}
        initialAssets={assets ?? []}
      />
    </div>
  );
}
