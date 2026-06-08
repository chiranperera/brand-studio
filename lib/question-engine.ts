/**
 * Adaptive question engine. Ported from the old tool's buildPrompt with three
 * changes (Phase 1 spec §7):
 *   1. Runs server-side (key stays secret) — see app/api/question/route.ts.
 *   2. The schema adds `field`: the BrandDataObject dot-path the answer fills.
 *   3. Completion is gated by computeCompleteness, not a question count — the
 *      AI is told which required fields are still empty and targets them.
 */
import { FIELD_PATHS } from "./mapping";

export type InputType = "textarea" | "text" | "select" | "multiselect" | "rating";

export interface Question {
  section: string;
  question: string;
  help?: string;
  inputType: InputType;
  options?: string[];
  field?: string; // dot-path into BrandDataObject
  interviewComplete?: boolean;
}

export interface HistoryItem {
  section: string;
  question: string;
  answer: string;
}

/** Canonical topic areas (carried over, expanded with the brand & design track). */
export const TOPICS = [
  "Business & Brand",
  "Target Audience",
  "Goals & Success",
  "Brand Personality & Voice",
  "Logo & Identity",
  "Color & Typography",
  "Visual Style & Imagery",
  "Surfaces & Screens",
  "References & Inspiration",
  "Constraints & Practicalities",
];

export const QUESTION_SCHEMA = {
  type: "object",
  properties: {
    section: { type: "string" },
    question: { type: "string" },
    help: { type: "string" },
    inputType: { type: "string", enum: ["textarea", "text", "select", "multiselect", "rating"] },
    options: { type: "array", items: { type: "string" } },
    field: { type: "string" },
    interviewComplete: { type: "boolean" },
  },
  required: ["section", "question", "inputType", "field", "interviewComplete"],
} as const;

export interface BuildPromptArgs {
  client: string;
  contact?: string;
  industry?: string;
  history: HistoryItem[];
  missing: string[]; // required field paths still empty (from computeCompleteness)
}

export function buildPrompt({ client, contact, industry, history, missing }: BuildPromptArgs): string {
  const hist =
    history.map((x, i) => `${i + 1}. [${x.section}] Q: ${x.question}\n   A: ${x.answer || "(skipped)"}`).join("\n") ||
    "(none yet — this is the first question)";

  const fieldList = FIELD_PATHS.map((f) => `- ${f.path} — ${f.about}`).join("\n");
  const ind = industry || "general";

  return `You are an expert brand & design discovery interviewer for a one-person AI-native creative studio. You are interviewing a prospective client to capture a complete, structured brand brief that will auto-generate a design system, logo direction, brand guidelines, and a website. Every answer must map to a typed field.

CLIENT: ${client}
CONTACT: ${contact || "unknown"}
INDUSTRY: ${ind}

TOPIC AREAS TO COVER: ${TOPICS.join("; ")}.

REQUIRED FIELDS STILL EMPTY (target these first — the session can only finish when this list is empty):
${missing.length ? missing.map((m) => `- ${m}`).join("\n") : "(all required fields captured)"}

CONVERSATION SO FAR:
${hist}

TASK: Produce the SINGLE best NEXT question to ask, as JSON.
RULES:
- KEEP THE QUESTION SHORT: one plain sentence, ideally under 12 words, no preamble. It must be readable aloud to a client. Personalize to the ${ind} industry and to prior answers.
- "Show, don't ask": prefer clickable answers. DEFAULT to "multiselect" for almost any option question — a client usually has more than one answer (offerings, audiences, surfaces, channels, features).
- Use "select" (one choice) ONLY when genuinely mutually exclusive (product/service/hybrid, light/dark, yes/no). Use "rating" for a 1-5 importance. Use "text" for a tiny fact (URL, a hex, a number). Use "textarea" ONLY when an open story is essential (e.g. their #1 goal) — keep it rare.
- For "select"/"multiselect", ALWAYS provide 4-8 CONCRETE options specific to the ${ind} industry, phrased in plain language (hide the jargon). The interviewer can add an "Other".
- "field" is REQUIRED: the BrandDataObject dot-path this answer fills, chosen from EXACTLY this list:
${fieldList}
- Do NOT repeat a question whose field is already well covered. Move the session toward emptying the REQUIRED FIELDS list above.
- "section" must be one of the topic areas. "help" is an optional ≤8-word hint.
- Set "interviewComplete": true ONLY when the REQUIRED FIELDS list above is empty. Otherwise false.
Return ONLY the JSON object.`;
}
