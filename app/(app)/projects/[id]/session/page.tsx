import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeBrandData, withAssetReferences, type BrandDataObject } from "@/lib/brand-data";
import type { InputType, Question } from "@/lib/question-engine";
import { BANK } from "@/lib/question-bank";
import { SessionFlow, type InitialAnswer } from "@/components/session/SessionFlow";
import type { AnswerVal } from "@/components/session/InputArea";

// Fallback option lists by field, so answered questions saved before options were
// stored still show their choices (drawn from the standard bank).
const BANK_OPTIONS: Record<string, string[]> = {};
for (const q of BANK) if (q.field && q.options?.length) BANK_OPTIONS[q.field] = q.options;

function toValue(answer: unknown): AnswerVal {
  if (answer == null) return "";
  if (Array.isArray(answer)) return answer.map(String);
  if (typeof answer === "number") return answer;
  if (typeof answer === "object") return "";
  return String(answer);
}

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
    .select("id, mode, join_code")
    .eq("project_id", id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!session) {
    const { data: created } = await supabase
      .from("sessions")
      .insert({ project_id: id, mode: "ai" })
      .select("id, mode, join_code")
      .single();
    session = created!;
  }

  const baseCols = "id, field_path, section, question, input_type, answer, note, position";
  let answerRows: Record<string, unknown>[] | null = null;
  const withOpts = await supabase
    .from("answers")
    .select(`${baseCols}, options`)
    .eq("project_id", id)
    .order("position", { ascending: true });
  if (withOpts.error) {
    // Fall back if the `options` column (migration 0003) isn't present yet.
    const r = await supabase.from("answers").select(baseCols).eq("project_id", id).order("position", { ascending: true });
    answerRows = (r.data as Record<string, unknown>[] | null) ?? null;
  } else {
    answerRows = (withOpts.data as Record<string, unknown>[] | null) ?? null;
  }

  const initialAnswers: InitialAnswer[] = (answerRows ?? []).map((a) => {
    const row = a as Record<string, unknown>;
    const field = (row.field_path as string) ?? undefined;
    const stored = (row.options as string[] | null) ?? null;
    // Use stored options; otherwise fall back to the standard list for that field.
    const options = stored?.length ? stored : field ? BANK_OPTIONS[field] ?? [] : [];
    return {
      id: row.id as string,
      question: {
        section: (row.section as string) ?? "",
        question: row.question as string,
        inputType: (row.input_type as InputType) ?? "text",
        field,
        options,
      } satisfies Question,
      value: toValue(row.answer),
      note: (row.note as string) ?? "",
    };
  });

  const { data: assets } = await supabase
    .from("assets")
    .select("id, kind, source, storage_path, sentiment, note")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const raw = (project.brand_data ?? {}) as Partial<BrandDataObject>;
  const bd = withAssetReferences(normalizeBrandData(raw, { id, client: project.client_name }), assets);

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
        initialAnswers={initialAnswers}
        initialAssets={assets ?? []}
        initialJoinCode={(session.join_code as string | null) ?? null}
      />
    </div>
  );
}
