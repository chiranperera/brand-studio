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

const ABOUT = new Map(FIELD_PATHS.map((f) => [f.path, f.about]));

/**
 * The ordered pool of fields worth asking a client. Each is asked at most once;
 * once asked, it's excluded — so questions never repeat (same form or reworded).
 * When the pool is exhausted the session completes.
 */
export const ASK_POOL: string[] = [
  "business.type",
  "business.description",
  "business.offerings",
  "business.stage",
  "audience.segments",
  "audience.b2x",
  "audience.jobsToBeDone",
  "goals.primary",
  "goals.metrics",
  "goals.blocker",
  "brand.personality",
  "brand.archetype",
  "voice.person",
  "voice.emoji",
  "logo.notes",
  "color.direction",
  "color.lightDark",
  "type.displayFeel",
  "type.bodyFeel",
  "visualStyle.cluster",
  "visualStyle.moodWords",
  "imagery.mode",
  "imagery.iconStyle",
  "constraints.stack",
  "constraints.accessibility",
];

/**
 * Required-field groups (alternatives within a group satisfy it). The session
 * shouldn't complete until each group has been asked. Mirrors brand-data's
 * REQUIRED list (minus the reference, which is satisfied by an upload).
 */
// Keep in sync with REQUIRED in lib/brand-data.ts. Alternatives within a group
// satisfy it. The session finishes when every group has been asked — covering
// all key brand & design categories, then stopping (no endless extra questions).
export const REQUIRED_GROUPS: string[][] = [
  ["business.type"],
  ["business.description"],
  ["business.offerings"],
  ["audience.segments"],
  ["goals.primary"],
  ["brand.archetype", "brand.personality"],
  ["voice.person"],
  // logo.preferredTypes is captured by the visual logo-type picker after the
  // questions (see LogoTypePicker), so it's not asked as a text question here.
  ["color.direction", "color.locked"],
  ["type.displayFeel"],
  ["visualStyle.cluster"],
  ["imagery.mode"],
  // surfaces + AI automation are captured by the Scope step (see ScopePicker),
  // so they're not asked as text questions here.
];

/** Required groups not yet asked (none of their fields appear in `asked`). */
export function unmetRequiredGroups(asked: Set<string>): string[][] {
  return REQUIRED_GROUPS.filter((g) => !g.some((f) => asked.has(f)));
}

/** Representative required field per unmet group (for the "ask these first" hint). */
export function requiredRemaining(asked: Set<string>): string[] {
  return unmetRequiredGroups(asked).map((g) => g[0]);
}

/** Attach each path's plain-language meaning. */
export function describe(paths: string[]): { path: string; about: string }[] {
  return paths.map((p) => ({ path: p, about: ABOUT.get(p) ?? "" }));
}

/** Fields still available to ask (in pool, not yet asked), with their meaning. */
export function availableFields(asked: Set<string>): { path: string; about: string }[] {
  return ASK_POOL.filter((p) => !asked.has(p)).map((p) => ({ path: p, about: ABOUT.get(p) ?? "" }));
}

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
  allowed: { path: string; about: string }[]; // fields not yet asked (the ONLY valid choices)
  asked: string[]; // fields already asked — must never be asked again
  requiredRemaining: string[]; // required fields whose group is still unasked
  retryNote?: string; // appended when re-asking after a guard rejection
}

export function buildPrompt({
  client,
  contact,
  industry,
  history,
  allowed,
  asked,
  requiredRemaining,
  retryNote,
}: BuildPromptArgs): string {
  const hist =
    history.map((x, i) => `${i + 1}. [${x.section}] Q: ${x.question}\n   A: ${x.answer || "(skipped)"}`).join("\n") ||
    "(none yet — this is the first question)";

  const allowedList = allowed.map((f) => `- ${f.path} — ${f.about}`).join("\n");
  const ind = industry || "general";
  const canComplete = requiredRemaining.length === 0;

  return `You are an expert brand & design discovery interviewer for a one-person AI-native creative studio. You are interviewing a prospective client to capture a complete, structured brand brief that will auto-generate a design system, logo direction, brand guidelines, and a website. Every answer must map to a typed field.

CLIENT: ${client}
CONTACT: ${contact || "unknown"}
INDUSTRY: ${ind}

CONVERSATION SO FAR:
${hist}

FIELDS ALREADY ASKED — NEVER ask about these again, not even reworded or from a different angle:
${asked.length ? asked.map((a) => `- ${a}`).join("\n") : "(none yet)"}

ASK NEXT — choose "field" from EXACTLY this list of not-yet-asked fields (nothing else is allowed):
${allowedList || "(none left — set interviewComplete: true)"}

${requiredRemaining.length ? `STILL REQUIRED (ask one of these first): ${requiredRemaining.join(", ")}.` : "All required fields are covered."}

TASK: Produce the SINGLE best NEXT question to ask, as JSON.
RULES:
- Pick "field" from the ASK NEXT list ONLY. It is the field this answer fills. One question = one field. Never choose a field from the ALREADY ASKED list.
- Do NOT ask anything that overlaps in meaning with a question already in the conversation, even if worded differently or expecting the same answer. If a topic is covered, move on.
- KEEP THE QUESTION SHORT: one plain sentence, ideally under 12 words, no preamble, readable aloud. Personalize to the ${ind} industry and prior answers.
- "Show, don't ask": DEFAULT to "multiselect". Use "select" only when mutually exclusive (product/service/hybrid, light/dark, yes/no). "rating" for 1-5 importance. "text" for a tiny fact. "textarea" only when an open story is essential — keep rare.
- For "select"/"multiselect", ALWAYS provide 4-8 CONCRETE options specific to the ${ind} industry, in plain language.
- "section" must be one of: ${TOPICS.join("; ")}. "help" is an optional ≤8-word hint.
- interviewComplete: ${canComplete ? 'you MAY set this true to finish now (all required fields covered); otherwise false and ask a remaining field.' : "false — required fields above are still needed."}${retryNote ? `\n- IMPORTANT: ${retryNote}` : ""}
Return ONLY the JSON object.`;
}
