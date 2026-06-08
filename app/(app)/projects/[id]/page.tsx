import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeCompleteness, emptyBrandData, withAssetReferences, type BrandDataObject } from "@/lib/brand-data";
import { ReferenceUpload } from "@/components/projects/ReferenceUpload";

export const dynamic = "force-dynamic";

export default async function ProjectOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, client_name, contact_name, industry, status, brand_data")
    .eq("id", id)
    .single();
  if (!project) redirect("/dashboard");

  const { data: assets } = await supabase
    .from("assets")
    .select("id, kind, source, storage_path, sentiment, note")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const raw = (project.brand_data ?? {}) as BrandDataObject;
  const bd = withAssetReferences(Object.keys(raw).length ? raw : emptyBrandData(), assets);
  const { score, missing } = computeCompleteness(bd);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-ink-4 hover:text-ink">
            ← All projects
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{project.client_name}</h1>
          <p className="text-sm text-ink-3">
            {project.industry || "—"} · {project.contact_name || "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/projects/${id}/session`} className="btn-ghost">
            {score > 0 ? "Resume session" : "Start session"}
          </Link>
          <Link href={`/projects/${id}/export`} className="btn-primary">
            Export
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <span className="label">Completeness</span>
          <div className="mono text-2xl font-semibold">{score}%</div>
        </div>
        <div className="card sm:col-span-2">
          <span className="label">Still needed for a valid pack</span>
          {missing.length === 0 ? (
            <p className="text-sm text-accent">All required fields captured ✓</p>
          ) : (
            <p className="text-sm text-ink-3">{missing.join(" · ")}</p>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-1 text-lg font-medium">References &amp; assets</h2>
        <p className="mb-4 text-sm text-ink-3">
          The highest-signal input. Upload inspiration, competitor screenshots, and the client&apos;s existing assets — tag
          each love / like / avoid.
        </p>
        <ReferenceUpload projectId={id} initialAssets={assets ?? []} />
      </div>
    </div>
  );
}
