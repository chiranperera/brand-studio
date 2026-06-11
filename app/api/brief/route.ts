import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBrief, generateDeliverables } from "@/lib/export/generate";
import { normalizeBrandData, type BrandDataObject } from "@/lib/brand-data";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { projectId } → { brief, deliverables } generated from brand_data. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { projectId } = (await req.json()) as { projectId: string };
  const { data: project, error } = await supabase
    .from("projects")
    .select("brand_data")
    .eq("id", projectId)
    .single();
  if (error || !project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const merged = normalizeBrandData(project.brand_data as Partial<BrandDataObject>);

  const [brief, deliverables] = await Promise.all([generateBrief(merged), generateDeliverables(merged)]);
  return NextResponse.json({ brief, deliverables });
}
