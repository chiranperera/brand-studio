import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gemini, parseJson } from "@/lib/gemini";
import { buildPrompt, QUESTION_SCHEMA, type Question, type HistoryItem } from "@/lib/question-engine";
import { computeCompleteness, emptyBrandData, withAssetReferences, type BrandDataObject } from "@/lib/brand-data";

export const runtime = "nodejs";

/** POST { projectId } → the next adaptive question (server-side Gemini). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { projectId } = (await req.json()) as { projectId: string };
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  // Load the project (RLS ensures ownership).
  const { data: project, error: pErr } = await supabase
    .from("projects")
    .select("client_name, contact_name, industry, brand_data")
    .eq("id", projectId)
    .single();
  if (pErr || !project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Rebuild history from the answer log.
  const { data: answers } = await supabase
    .from("answers")
    .select("section, question, answer")
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  const history: HistoryItem[] = (answers ?? []).map((a) => ({
    section: a.section ?? "",
    question: a.question,
    answer: Array.isArray(a.answer) ? (a.answer as string[]).join(", ") : String(a.answer ?? ""),
  }));

  const { data: assets } = await supabase.from("assets").select("kind").eq("project_id", projectId);

  const bd = (project.brand_data ?? {}) as BrandDataObject;
  const merged = withAssetReferences(Object.keys(bd).length ? bd : emptyBrandData(), assets);
  const { missing } = computeCompleteness(merged);

  const prompt = buildPrompt({
    client: project.client_name,
    contact: project.contact_name ?? undefined,
    industry: project.industry ?? undefined,
    history,
    missing,
  });

  try {
    const raw = await gemini(prompt, QUESTION_SCHEMA as unknown as Record<string, unknown>);
    const q = parseJson<Question>(raw);
    return NextResponse.json({ question: q });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
