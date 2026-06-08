import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { deriveTokens } from "@/lib/tokens";
import { generateBrief, generateDeliverables } from "@/lib/export/generate";
import {
  buildDesignPack,
  type AssetFile,
  type ReferenceManifestItem,
} from "@/lib/export/design-pack";
import {
  brandDataSchema,
  computeCompleteness,
  emptyBrandData,
  withAssetReferences,
  type BrandDataObject,
} from "@/lib/brand-data";

export const runtime = "nodejs";
export const maxDuration = 60;

const EXT = (path: string) => {
  const m = /\.([a-z0-9]+)$/i.exec(path);
  return m ? m[1].toLowerCase() : "bin";
};
// Client-owned kinds go in assets/, evidence kinds go in references/.
const ASSET_KINDS = new Set(["logo", "guidelines", "product"]);

/** POST { projectId, override? } → { url } signed download for the Design Pack zip. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { projectId, override } = (await req.json()) as { projectId: string; override?: boolean };

  const { data: project, error } = await supabase
    .from("projects")
    .select("client_name, brand_data")
    .eq("id", projectId)
    .single();
  if (error || !project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Load assets up front: they back both the completeness check (references) and
  // the references/ folder in the pack.
  const { data: assets } = await supabase
    .from("assets")
    .select("kind, source, storage_path, sentiment, note, extracted")
    .eq("project_id", projectId);

  const raw = (project.brand_data ?? {}) as BrandDataObject;
  const bd = withAssetReferences(Object.keys(raw).length ? raw : emptyBrandData(), assets);

  // Gate on completeness unless the host overrides.
  const { missing } = computeCompleteness(bd);
  if (missing.length && !override) {
    return NextResponse.json({ error: "incomplete", missing }, { status: 422 });
  }
  // Validate shape (warn-only; don't hard-block a present-but-loose object).
  brandDataSchema.partial().safeParse(bd);

  const date = new Date().toISOString().slice(0, 10);
  const admin = createAdminClient();

  const references: ReferenceManifestItem[] = [];
  const assetFiles: AssetFile[] = [];
  const counters: Record<string, number> = {};

  for (const a of assets ?? []) {
    const kind = a.kind ?? "inspiration";
    const folder = ASSET_KINDS.has(kind) ? "assets" : "references";
    let file: string | undefined;

    if (a.storage_path) {
      const { data: blob } = await admin.storage.from("references").download(a.storage_path);
      if (blob) {
        counters[kind] = (counters[kind] ?? 0) + 1;
        const idx = String(counters[kind]).padStart(2, "0");
        file = `${folder}/${kind}-${idx}.${EXT(a.storage_path)}`;
        assetFiles.push({ path: file, data: new Uint8Array(await blob.arrayBuffer()) });
      }
    }

    references.push({
      file,
      type: kind,
      source: a.source ?? undefined,
      sentiment: (a.sentiment as ReferenceManifestItem["sentiment"]) ?? undefined,
      note: a.note ?? undefined,
      extracted: (a.extracted as ReferenceManifestItem["extracted"]) ?? undefined,
    });
  }

  const tokens = deriveTokens(bd);
  const [brief, deliverables] = await Promise.all([generateBrief(bd), generateDeliverables(bd)]);

  const zip = await buildDesignPack({
    projectId,
    brandData: bd,
    tokens,
    brief,
    deliverables,
    references,
    assetFiles,
    date,
  });

  // Upload zip to the private exports bucket.
  const storagePath = `${projectId}/design-pack-${date}.zip`;
  const { error: upErr } = await admin.storage.from("exports").upload(storagePath, zip, {
    contentType: "application/zip",
    upsert: true,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  await supabase.from("exports").insert({ project_id: projectId, storage_path: storagePath });
  await supabase.from("projects").update({ status: "exported" }).eq("id", projectId);

  const { data: signed } = await admin.storage.from("exports").createSignedUrl(storagePath, 60 * 60);
  return NextResponse.json({ url: signed?.signedUrl, path: storagePath, missing });
}
