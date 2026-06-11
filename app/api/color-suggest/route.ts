import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gemini, parseJson } from "@/lib/gemini";
import { PALETTES } from "@/lib/color-palettes";
import type { BrandDataObject } from "@/lib/brand-data";

export const runtime = "nodejs";

type Role = "primary" | "secondary" | "accent" | "neutral";
interface SugPalette {
  name: string;
  mood: string;
  colors: { hex: string; role: Role }[];
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const ROLES: Role[] = ["primary", "secondary", "accent", "neutral"];

const SCHEMA = {
  type: "object",
  properties: {
    palettes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          mood: { type: "string" },
          colors: {
            type: "array",
            items: {
              type: "object",
              properties: { hex: { type: "string" }, role: { type: "string", enum: ROLES } },
              required: ["hex", "role"],
            },
          },
        },
        required: ["name", "colors"],
      },
    },
  },
  required: ["palettes"],
} as const;

/** POST { projectId } → 3 industry-appropriate, editable colour palettes. */
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
  const direction = bd.color?.direction || "";
  const personality = (bd.brand?.personality ?? []).map((p) => p.trait).join(", ");

  const prompt = `Suggest 3 distinct colour palettes for THIS brand. Be industry-appropriate and tasteful — pick colours a real brand designer would choose for this field (e.g. insurance/finance → trustworthy blues, calm greens, deep navy; restaurant/food → warm reds, oranges, yellows; wellness → soft greens, earthy neutrals; tech → electric/neon accents on dark; kids → bright playful tones).

CLIENT: ${project.client_name}
INDUSTRY: ${project.industry || "general"}
WHAT THEY DO: ${bd.business?.description || "—"}
${direction ? `COLOUR DIRECTION THEY GAVE: ${direction}` : ""}
${personality ? `BRAND PERSONALITY: ${personality}` : ""}

Each palette: a short name, a one-line mood, and EXACTLY 4 colours with roles primary, secondary, accent, neutral. Colours must be 6-digit hex (#RRGGBB). Ensure good contrast and a usable neutral (dark or light). Return ONLY JSON: { "palettes": [ { "name", "mood", "colors": [ {"hex","role"} ] } ] }.`;

  try {
    const raw = await gemini(prompt, SCHEMA as unknown as Record<string, unknown>);
    const out = parseJson<{ palettes: SugPalette[] }>(raw);
    const palettes = (out.palettes ?? [])
      .map((p) => ({
        name: String(p.name || "Palette"),
        mood: String(p.mood || ""),
        colors: (p.colors ?? [])
          .filter((c) => HEX.test(c.hex) && ROLES.includes(c.role))
          .map((c) => ({ hex: c.hex.toUpperCase(), role: c.role })),
      }))
      .filter((p) => p.colors.length >= 3)
      .slice(0, 3);
    if (palettes.length) return NextResponse.json({ palettes });
  } catch {
    /* fall through */
  }
  // Fallback: a few curated presets.
  return NextResponse.json({ palettes: PALETTES.slice(0, 3).map(({ name, mood, colors }) => ({ name, mood, colors })) });
}
