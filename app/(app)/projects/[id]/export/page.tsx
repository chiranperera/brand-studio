import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeCompleteness, emptyBrandData, type BrandDataObject } from "@/lib/brand-data";
import { ExportPanel } from "@/components/projects/ExportPanel";

export const dynamic = "force-dynamic";

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("client_name, brand_data")
    .eq("id", id)
    .single();
  if (!project) redirect("/dashboard");

  const raw = (project.brand_data ?? {}) as BrandDataObject;
  const bd = Object.keys(raw).length ? raw : emptyBrandData();
  const { score, missing } = computeCompleteness(bd);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/projects/${id}`} className="text-sm text-ink-4 hover:text-ink">
          ← {project.client_name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Export Design Pack</h1>
        <p className="text-sm text-ink-3">
          Assembles README, brief, brand-data.json, DTCG tokens, references and deliverables into one zip.
        </p>
      </div>

      <ExportPanel projectId={id} initialScore={score} initialMissing={missing} />
    </div>
  );
}
