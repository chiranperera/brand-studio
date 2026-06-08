/**
 * Generate brief.md and deliverables/*.md from the Brand Data Object via Gemini,
 * falling back to deterministic templates when the LLM is unavailable. Shared by
 * app/api/brief/route.ts and app/api/export/route.ts.
 */
import { gemini } from "../gemini";
import type { BrandDataObject } from "../brand-data";
import { fallbackBrief, fallbackDeliverables } from "./design-pack";

export async function generateBrief(bd: BrandDataObject): Promise<string> {
  const prompt = `You are a senior brand strategist. Using ONLY the structured brand data below, write a sharp, plain-English design brief in Markdown for a designer (and for an AI design tool) to act on. Do NOT invent facts not present in the data; where something is missing, write "—".

Use exactly these sections as H2 headings: Snapshot, Audience, Brand personality & archetype, Voice & tone, Visual direction, Logo direction, Color direction, Must-haves & no-gos. Keep it tight and concrete. Exact color values live in the tokens file, so describe color in words here.

BRAND DATA (JSON):
${JSON.stringify(bd, null, 2)}

Return ONLY the Markdown brief.`;
  try {
    const out = await gemini(prompt);
    return out.trim() || fallbackBrief(bd);
  } catch {
    return fallbackBrief(bd);
  }
}

export async function generateDeliverables(bd: BrandDataObject): Promise<{ name: string; content: string }[]> {
  // Determine which deliverables are in scope from the captured surfaces.
  const base = fallbackDeliverables(bd);
  const prompt = `You are a design lead writing focused build briefs. For the brand data below, write the body of ONE deliverable brief in Markdown. It must contain: Goal, Scope, Specific requirements, What to use from the pack, Acceptance criteria. Be concrete and on-brand. Do not invent facts; use "—" where unknown.

DELIVERABLE: {NAME}

BRAND DATA (JSON):
${JSON.stringify(bd, null, 2)}

Return ONLY the Markdown body.`;

  const results = await Promise.all(
    base.map(async (d) => {
      try {
        const out = await gemini(prompt.replace("{NAME}", d.name.replace(/\.md$/, "")));
        return { name: d.name, content: out.trim() || d.content };
      } catch {
        return d;
      }
    })
  );
  return results;
}
