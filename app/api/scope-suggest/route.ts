import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gemini, parseJson } from "@/lib/gemini";
import {
  SURFACE_KINDS,
  WEBSITE_SECTIONS,
  WEBSITE_FEATURES,
  AUTOMATION_NEEDS,
  AUTOMATION_LEVELS,
} from "@/lib/scope-options";
import type { BrandDataObject } from "@/lib/brand-data";

export const runtime = "nodejs";

interface Suggestion {
  kinds: string[];
  sections: string[];
  features: string[];
  needs: string[];
  level: string;
}

/** Keep only values that exist in the canonical option list. */
const only = (values: unknown, allowed: string[]): string[] =>
  Array.isArray(values) ? values.filter((v): v is string => typeof v === "string" && allowed.includes(v)) : [];

/** Industry-agnostic fallback if the model is unavailable. */
const FALLBACK: Suggestion = {
  kinds: ["Website"],
  sections: ["Hero", "About", "Services / Products", "Testimonials / Reviews", "Contact"],
  features: ["Contact form"],
  needs: ["AI chatbot (answer FAQs)", "Lead capture & qualification"],
  level: AUTOMATION_LEVELS[0],
};

const SCHEMA = {
  type: "object",
  properties: {
    kinds: { type: "array", items: { type: "string", enum: SURFACE_KINDS } },
    sections: { type: "array", items: { type: "string", enum: WEBSITE_SECTIONS } },
    features: { type: "array", items: { type: "string", enum: WEBSITE_FEATURES } },
    needs: { type: "array", items: { type: "string", enum: AUTOMATION_NEEDS } },
    level: { type: "string", enum: AUTOMATION_LEVELS },
  },
  required: ["kinds", "sections", "features", "needs", "level"],
} as const;

/** POST { projectId } → suggested scope (sections/features/automations) for the industry. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { projectId } = (await req.json()) as { projectId: string };
  const { data: project } = await supabase
    .from("projects")
    .select("industry, client_name, brand_data")
    .eq("id", projectId)
    .single();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const bd = (project.brand_data ?? {}) as Partial<BrandDataObject>;
  const offerings = (bd.business?.offerings ?? []).map((o) => o.name).join(", ") || "—";
  const audience = (bd.audience?.segments ?? []).map((s) => s.name).join(", ") || "—";

  const prompt = `You are scoping a web/app + AI-automation project for a client of a one-person AI-native studio. Pick the MOST relevant options for THIS business from the fixed lists — be realistic and industry-specific (e.g. a clinic → online booking + appointment booking + reminders; a restaurant → menu/gallery + reservations; an e-commerce brand → store + payments + abandoned-cart follow-up).

CLIENT: ${project.client_name}
INDUSTRY: ${project.industry || "general"}
TYPE: ${bd.business?.type || "unknown"}
WHAT THEY DO: ${bd.business?.description || "—"}
OFFERINGS: ${offerings}
AUDIENCE: ${audience}
PRIMARY GOAL: ${bd.goals?.primary || "—"}

Choose from EXACTLY these lists (use only these strings):
- kinds: ${SURFACE_KINDS.join(" | ")}
- sections: ${WEBSITE_SECTIONS.join(" | ")}
- features: ${WEBSITE_FEATURES.join(" | ")}
- needs (AI automations): ${AUTOMATION_NEEDS.join(" | ")}
- level: ${AUTOMATION_LEVELS.join(" | ")}

Rules: pick 1-2 kinds; 5-8 sections (the essential sales-driving pages); 2-5 features; 2-4 automations that fit the industry's real workflow; one level. Return ONLY the JSON.`;

  try {
    const raw = await gemini(prompt, SCHEMA as unknown as Record<string, unknown>);
    const s = parseJson<Suggestion>(raw);
    const level = AUTOMATION_LEVELS.includes(s.level) ? s.level : FALLBACK.level;
    return NextResponse.json({
      kinds: only(s.kinds, SURFACE_KINDS).length ? only(s.kinds, SURFACE_KINDS) : FALLBACK.kinds,
      sections: only(s.sections, WEBSITE_SECTIONS),
      features: only(s.features, WEBSITE_FEATURES),
      needs: only(s.needs, AUTOMATION_NEEDS).length ? only(s.needs, AUTOMATION_NEEDS) : FALLBACK.needs,
      level,
    });
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
