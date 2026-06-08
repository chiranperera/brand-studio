/**
 * The Brand Data Object — the typed source of truth for a discovery session.
 *
 * Every answer in a session maps to a field in this object (see lib/mapping.ts).
 * By the end of a session `projects.brand_data` is a fully populated instance,
 * and the Design Pack export (lib/export/design-pack.ts) just reads it.
 *
 * Schema mirrors the blueprint §9 data model.
 */
import { z } from "zod";

/* ----------------------------- sub-types ----------------------------- */

export type LogoType =
  | "wordmark"
  | "lettermark"
  | "pictorial"
  | "abstract"
  | "mascot"
  | "combination"
  | "emblem";

export type Sentiment = "love" | "like" | "avoid";

export interface Offering {
  name: string;
  priority: "core" | "secondary";
}

export interface Segment {
  name: string;
  description?: string;
}

export interface BrandDataObject {
  project: {
    id: string;
    client: string;
    contact?: string;
    clientEmail?: string;
    industry?: string;
    createdAt?: string;
  };

  business: {
    type?: "product" | "service" | "hybrid";
    description?: string;
    offerings: Offering[];
    stage?: string;
    model?: string;
  };

  audience: {
    segments: Segment[];
    b2x?: "B2B" | "B2C" | "both";
    jobsToBeDone: string[];
  };

  goals: {
    primary?: string;
    metrics: string[];
    blocker?: string;
  };

  market: {
    competitors: { name: string; url?: string; sentiment: "admire" | "avoid" }[];
    positioning: { axis: string; value: string }[];
  };

  brand: {
    personality: { trait: string; score: number }[];
    archetype?: string;
    keywords: string[];
  };

  voice: {
    formality?: number; // 0 (formal) … 100 (casual)
    person?: "we" | "you" | "mixed";
    emoji?: boolean;
    examples: string[];
  };

  logo: {
    preferredTypes: LogoType[];
    avoid: LogoType[];
    notes?: string;
  };

  color: {
    locked: { hex: string; name?: string }[];
    direction?: string;
    chosenPalette: { hex: string; role: "primary" | "secondary" | "accent" | "neutral" }[];
    productColors?: { hex: string; name?: string }[];
    lightDark?: "light" | "dark" | "both";
  };

  type: {
    displayFeel?: string;
    bodyFeel?: string;
    fonts?: { display?: string; body?: string; mono?: string };
  };

  visualStyle: {
    cluster?: string;
    moodWords: string[];
  };

  imagery: {
    mode: ("photo" | "illustration" | "3d")[];
    iconStyle?: string;
    mood?: string;
  };

  surfaces: { kind: string; screens: string[]; components: string[] }[];

  product?: {
    skus?: string;
    formats?: string;
    materials?: string;
    packagingNeeds: string[];
  };

  references: {
    type: string;
    source?: string;
    extracted?: { palette: string[]; fonts: string[] };
    sentiment?: Sentiment;
    note?: string;
    file?: string;
  }[];

  constraints: {
    accessibility?: string;
    localization?: string;
    stack?: string;
    cms?: string;
    compliance?: string;
  };

  meta: {
    completeness: number;
    requiredMissing: string[];
    readinessScore?: number;
  };
}

/* ----------------------------- factory ----------------------------- */

export function emptyBrandData(seed?: Partial<BrandDataObject["project"]>): BrandDataObject {
  return {
    project: {
      id: seed?.id ?? "",
      client: seed?.client ?? "",
      contact: seed?.contact,
      clientEmail: seed?.clientEmail,
      industry: seed?.industry,
      createdAt: seed?.createdAt,
    },
    business: { offerings: [] },
    audience: { segments: [], jobsToBeDone: [] },
    goals: { metrics: [] },
    market: { competitors: [], positioning: [] },
    brand: { personality: [], keywords: [] },
    voice: { examples: [] },
    logo: { preferredTypes: [], avoid: [] },
    color: { locked: [], chosenPalette: [] },
    type: {},
    visualStyle: { moodWords: [] },
    imagery: { mode: [] },
    surfaces: [],
    references: [],
    constraints: {},
    meta: { completeness: 0, requiredMissing: [] },
  };
}

/* ----------------------------- zod schema ----------------------------- */

const offering = z.object({ name: z.string(), priority: z.enum(["core", "secondary"]) });
const segment = z.object({ name: z.string(), description: z.string().optional() });

export const brandDataSchema = z.object({
  project: z.object({
    id: z.string(),
    client: z.string().min(1),
    contact: z.string().optional(),
    clientEmail: z.string().optional(),
    industry: z.string().optional(),
    createdAt: z.string().optional(),
  }),
  business: z.object({
    type: z.enum(["product", "service", "hybrid"]).optional(),
    description: z.string().optional(),
    offerings: z.array(offering),
    stage: z.string().optional(),
    model: z.string().optional(),
  }),
  audience: z.object({
    segments: z.array(segment),
    b2x: z.enum(["B2B", "B2C", "both"]).optional(),
    jobsToBeDone: z.array(z.string()),
  }),
  goals: z.object({
    primary: z.string().optional(),
    metrics: z.array(z.string()),
    blocker: z.string().optional(),
  }),
  market: z.object({
    competitors: z.array(
      z.object({ name: z.string(), url: z.string().optional(), sentiment: z.enum(["admire", "avoid"]) })
    ),
    positioning: z.array(z.object({ axis: z.string(), value: z.string() })),
  }),
  brand: z.object({
    personality: z.array(z.object({ trait: z.string(), score: z.number() })),
    archetype: z.string().optional(),
    keywords: z.array(z.string()),
  }),
  voice: z.object({
    formality: z.number().optional(),
    person: z.enum(["we", "you", "mixed"]).optional(),
    emoji: z.boolean().optional(),
    examples: z.array(z.string()),
  }),
  logo: z.object({
    preferredTypes: z.array(z.string()),
    avoid: z.array(z.string()),
    notes: z.string().optional(),
  }),
  color: z.object({
    locked: z.array(z.object({ hex: z.string(), name: z.string().optional() })),
    direction: z.string().optional(),
    chosenPalette: z.array(
      z.object({ hex: z.string(), role: z.enum(["primary", "secondary", "accent", "neutral"]) })
    ),
    productColors: z.array(z.object({ hex: z.string(), name: z.string().optional() })).optional(),
    lightDark: z.enum(["light", "dark", "both"]).optional(),
  }),
  type: z.object({
    displayFeel: z.string().optional(),
    bodyFeel: z.string().optional(),
    fonts: z
      .object({ display: z.string().optional(), body: z.string().optional(), mono: z.string().optional() })
      .optional(),
  }),
  visualStyle: z.object({ cluster: z.string().optional(), moodWords: z.array(z.string()) }),
  imagery: z.object({
    mode: z.array(z.enum(["photo", "illustration", "3d"])),
    iconStyle: z.string().optional(),
    mood: z.string().optional(),
  }),
  surfaces: z.array(
    z.object({ kind: z.string(), screens: z.array(z.string()), components: z.array(z.string()) })
  ),
  product: z
    .object({
      skus: z.string().optional(),
      formats: z.string().optional(),
      materials: z.string().optional(),
      packagingNeeds: z.array(z.string()),
    })
    .optional(),
  references: z.array(
    z.object({
      type: z.string(),
      source: z.string().optional(),
      extracted: z.object({ palette: z.array(z.string()), fonts: z.array(z.string()) }).optional(),
      sentiment: z.enum(["love", "like", "avoid"]).optional(),
      note: z.string().optional(),
      file: z.string().optional(),
    })
  ),
  constraints: z.object({
    accessibility: z.string().optional(),
    localization: z.string().optional(),
    stack: z.string().optional(),
    cms: z.string().optional(),
    compliance: z.string().optional(),
  }),
  meta: z.object({
    completeness: z.number(),
    requiredMissing: z.array(z.string()),
    readinessScore: z.number().optional(),
  }),
});

/* ----------------------------- completeness ----------------------------- */

/**
 * Required fields for a valid Design Pack (Phase 1 spec §5). Each entry is a
 * human label + a predicate. `computeCompleteness` powers the progress rail and
 * gates export.
 */
const REQUIRED: { label: string; ok: (b: BrandDataObject) => boolean }[] = [
  { label: "business.type", ok: (b) => !!b.business.type },
  { label: "business.description", ok: (b) => !!b.business.description?.trim() },
  { label: "business.offerings", ok: (b) => b.business.offerings.length > 0 },
  { label: "audience.segments", ok: (b) => b.audience.segments.length > 0 },
  { label: "goals.primary", ok: (b) => !!b.goals.primary?.trim() },
  { label: "brand.archetype or brand.personality", ok: (b) => !!b.brand.archetype || b.brand.personality.length > 0 },
  { label: "color.direction or color.locked", ok: (b) => !!b.color.direction || b.color.locked.length > 0 },
  { label: "type.displayFeel", ok: (b) => !!b.type.displayFeel },
  { label: "surfaces", ok: (b) => b.surfaces.length > 0 },
  { label: "≥1 reference", ok: (b) => b.references.length > 0 },
];

export function computeCompleteness(b: BrandDataObject): { score: number; missing: string[] } {
  const missing = REQUIRED.filter((r) => !r.ok(b)).map((r) => r.label);
  const score = Math.round(((REQUIRED.length - missing.length) / REQUIRED.length) * 100);
  return { score, missing };
}

/**
 * Uploaded references live in the `assets` table; mirror them into
 * `brand_data.references` at read time so completeness reflects real uploads.
 */
type AssetRow = { kind?: string | null; source?: string | null; sentiment?: string | null; note?: string | null };
export function withAssetReferences(b: BrandDataObject, assets: AssetRow[] | null | undefined): BrandDataObject {
  if (!assets?.length) return b;
  return {
    ...b,
    references: assets.map((a) => ({
      type: a.kind ?? "upload",
      source: a.source ?? undefined,
      sentiment: (a.sentiment as Sentiment | undefined) ?? undefined,
      note: a.note ?? undefined,
    })),
  };
}
