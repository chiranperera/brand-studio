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
  // Business & strategy
  "business.type",
  "business.description",
  "business.offerings",
  "business.differentiator",
  "business.story",
  "business.stage",
  "context.currentSite",
  "context.presenceGaps",
  // Audience
  "audience.segments",
  "audience.demographics",
  "audience.b2x",
  "audience.painPoints",
  "audience.jobsToBeDone",
  // Goals & market
  "goals.primary",
  "goals.metrics",
  "goals.blocker",
  "market.competitors",
  "market.positioning",
  // Purpose, future & commercial
  "brand.mission",
  "brand.vision",
  "brand.values",
  "context.timeline",
  "context.budget",
  "context.decisionMakers",
  // Brand personality & voice
  "brand.personality",
  "brand.archetype",
  "brand.keywords",
  "voice.person",
  "voice.emoji",
  "logo.notes",
  // Colour, type & imagery (type.displayFeel/bodyFeel captured by the type picker)
  "color.direction",
  "color.lightDark",
  "visualStyle.cluster",
  "visualStyle.moodWords",
  "imagery.mode",
  "imagery.iconStyle",
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
  // type.displayFeel is captured by the visual type-specimen picker.
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
  "Business & Strategy",
  "Differentiation & Story",
  "Target Audience",
  "Goals & Market",
  "Purpose & Future",
  "Commercials",
  "Brand Personality & Voice",
  "Colour & Typography",
  "Visual Style & Imagery",
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

  return `You are a senior brand strategist running a live discovery session for a one-person AI-native creative studio. You are interviewing a prospective client to capture a deep, structured brand brief that will auto-generate a design system, logo direction, brand guidelines, and a website. This is a real consulting conversation — go deeper than a generic form. Every answer maps to one typed field.

CLIENT: ${client}
CONTACT: ${contact || "unknown"}
INDUSTRY: ${ind}

CONVERSATION SO FAR:
${hist}

FIELDS ALREADY ASKED — NEVER ask about these again, not even reworded or from a different angle:
${asked.length ? asked.map((a) => `- ${a}`).join("\n") : "(none yet)"}

ASK NEXT — choose "field" from EXACTLY this list of not-yet-asked fields (nothing else is allowed):
${allowedList || "(none left)"}

${requiredRemaining.length ? `PRIORITISE these still-needed fields: ${requiredRemaining.join(", ")}.` : ""}

TASK: Produce the SINGLE best NEXT question to ask, as JSON.
QUALITY (this is what separates a real strategist from a form):
- Make it SPECIFIC to ${client} and the ${ind} industry, building on what they've already said — reference their actual answers where natural. Never generic.
- Capture the WHY, not just the what — get at motivation, differentiation, and feeling (e.g. "what should customers FEEL when they find you?", "why do customers pick you over X?").
- One question = one field. Pick "field" from the ASK NEXT list ONLY. Never repeat or reword an already-asked topic.
RULES:
- KEEP IT SHORT: one plain sentence, readable aloud, no preamble.
- "Show, don't ask": DEFAULT to "multiselect". Use "select" only when mutually exclusive. "rating" for 1-5 importance. "text" for a tiny fact (a URL, a budget figure). "textarea" only for a genuine open story (mission, differentiation, the #1 goal) — these deeper fields deserve textarea.
- For "select"/"multiselect", ALWAYS give 4-8 CONCRETE options tailored to the ${ind} industry, in plain language. The client can add their own.
- "section" must be one of: ${TOPICS.join("; ")}. "help" is an optional ≤8-word hint.
- interviewComplete: false — keep asking; the session ends on its own when the topics are exhausted.${retryNote ? `\n- IMPORTANT: ${retryNote}` : ""}
Return ONLY the JSON object.`;
}
