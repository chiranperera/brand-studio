import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gemini, parseJson } from "@/lib/gemini";
import {
  buildPrompt,
  QUESTION_SCHEMA,
  availableFields,
  requiredRemaining,
  type Question,
  type HistoryItem,
} from "@/lib/question-engine";
import { BANK } from "@/lib/question-bank";

export const runtime = "nodejs";

const COMPLETE: Question = {
  section: "Discovery",
  question: "All set.",
  inputType: "text",
  interviewComplete: true,
};

/** Deterministic fallback question for a target field (uses the standard bank). */
function fallbackQuestion(field: string): Question {
  const fromBank = BANK.find((b) => b.field === field);
  if (fromBank) return { ...fromBank, interviewComplete: false };
  return { section: "Discovery", question: `Tell us more about ${field}.`, inputType: "text", field, interviewComplete: false };
}

/** POST { projectId } → the next adaptive question (server-side Gemini, deduped). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { projectId } = (await req.json()) as { projectId: string };
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  const { data: project, error: pErr } = await supabase
    .from("projects")
    .select("client_name, contact_name, industry")
    .eq("id", projectId)
    .single();
  if (pErr || !project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const { data: answers } = await supabase
    .from("answers")
    .select("section, question, answer, field_path")
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  const history: HistoryItem[] = (answers ?? []).map((a) => ({
    section: a.section ?? "",
    question: a.question,
    answer: Array.isArray(a.answer) ? (a.answer as string[]).join(", ") : String(a.answer ?? ""),
  }));

  // Fields already asked (the dedup key): never offer or accept these again.
  const asked = new Set<string>((answers ?? []).map((a) => a.field_path).filter((f): f is string => !!f));

  // Ask through the full discovery pool, deduped. The session ends only when the
  // pool is exhausted; required fields are prioritised so 100% is reached early.
  const allowed = availableFields(asked);
  if (allowed.length === 0) return NextResponse.json({ question: COMPLETE });

  const reqRemaining = requiredRemaining(asked);
  const allowedSet = new Set(allowed.map((a) => a.path));
  const base = {
    client: project.client_name,
    contact: project.contact_name ?? undefined,
    industry: project.industry ?? undefined,
    history,
    allowed,
    asked: [...asked],
    requiredRemaining: reqRemaining,
  };

  // Try the model, guarding against repeats and premature completion; retry with
  // a stronger note, then fall back to a deterministic on-field question.
  let retryNote: string | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const raw = await gemini(buildPrompt({ ...base, retryNote }), QUESTION_SCHEMA as unknown as Record<string, unknown>);
      const q = parseJson<Question>(raw);

      // The AI doesn't decide completion — the route ends when the pool is empty.
      if (q.interviewComplete) {
        retryNote = `Do NOT finish — there are still topics to cover. Ask about one of: ${
          reqRemaining.length ? reqRemaining.join(", ") : allowed.slice(0, 5).map((a) => a.path).join(", ")
        }.`;
        continue;
      }

      // Repeat / out-of-list field — reject and retry.
      if (!q.field || !allowedSet.has(q.field)) {
        retryNote = `You chose "${q.field ?? "(none)"}", which is already asked or not allowed. Choose "field" ONLY from the ASK NEXT list.`;
        continue;
      }
      return NextResponse.json({ question: q });
    } catch (e) {
      // On the last attempt, fall through to the deterministic fallback.
      if (attempt === 2) {
        return NextResponse.json({ question: fallbackQuestion(reqRemaining[0] ?? allowed[0].path) });
      }
      retryNote = `Previous attempt failed (${(e as Error).message}). Return valid JSON.`;
    }
  }

  // All retries produced repeats — use a guaranteed-fresh on-field question.
  return NextResponse.json({ question: fallbackQuestion(reqRemaining[0] ?? allowed[0].path) });
}
