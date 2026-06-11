/**
 * Answer → BrandDataObject field writer.
 *
 * The core architectural upgrade over the old tool: every question declares a
 * `field` (a dot-path) and `writeField` knows how to coerce the answer value
 * into the correct typed slot — handling string / string[] / number / boolean
 * and append-vs-replace semantics per field.
 *
 * FIELD_PATHS is the canonical enumeration handed to the AI in the prompt.
 */
import type { BrandDataObject, LogoType } from "./brand-data";

export type AnswerValue = string | string[] | number | boolean | null;

/** Canonical dot-paths the AI/bank may target, with a one-line meaning. */
export const FIELD_PATHS: { path: string; about: string }[] = [
  { path: "business.type", about: "product | service | hybrid" },
  { path: "business.description", about: "one-line what the business does" },
  { path: "business.offerings", about: "products/services they sell" },
  { path: "business.stage", about: "startup / established / scaling" },
  { path: "business.model", about: "how they make money" },
  { path: "audience.segments", about: "who they serve" },
  { path: "audience.b2x", about: "B2B | B2C | both" },
  { path: "audience.jobsToBeDone", about: "what the customer is trying to get done" },
  { path: "goals.primary", about: "the #1 outcome this project must achieve" },
  { path: "goals.metrics", about: "how success is measured" },
  { path: "goals.blocker", about: "what's stopping them today" },
  { path: "market.competitors", about: "named competitors" },
  { path: "market.positioning", about: "premium↔accessible, niche↔mass" },
  { path: "brand.personality", about: "personality traits/adjectives" },
  { path: "brand.archetype", about: "Hero / Sage / Creator / Outlaw …" },
  { path: "brand.keywords", about: "descriptive brand words" },
  { path: "voice.formality", about: "0 formal … 100 casual" },
  { path: "voice.person", about: "we | you | mixed" },
  { path: "voice.emoji", about: "emoji yes/no" },
  { path: "voice.examples", about: "sample on-brand sentences" },
  { path: "logo.preferredTypes", about: "wordmark/lettermark/pictorial/abstract/mascot/combination/emblem" },
  { path: "logo.avoid", about: "logo types to avoid" },
  { path: "logo.notes", about: "why / what to convey" },
  { path: "color.locked", about: "hex colours they must keep" },
  { path: "color.direction", about: "emotional colour direction" },
  { path: "color.chosenPalette", about: "chosen palette hexes" },
  { path: "color.productColors", about: "packaging/product colours" },
  { path: "color.lightDark", about: "light | dark | both" },
  { path: "type.displayFeel", about: "headline type personality" },
  { path: "type.bodyFeel", about: "body type personality" },
  { path: "visualStyle.cluster", about: "minimal-luxury / playful-bold / techy-futuristic …" },
  { path: "visualStyle.moodWords", about: "3 words describing the look" },
  { path: "imagery.mode", about: "photo | illustration | 3d" },
  { path: "imagery.iconStyle", about: "line | solid | duotone" },
  { path: "imagery.mood", about: "warm / cool / b&w / grain" },
  { path: "surfaces", about: "website / app / social / packaging to design" },
  { path: "product.packagingNeeds", about: "packaging/dieline needs" },
  { path: "constraints.accessibility", about: "accessibility needs" },
  { path: "constraints.localization", about: "languages / RTL" },
  { path: "constraints.stack", about: "tech stack / CMS constraints" },
  { path: "constraints.compliance", about: "compliance/legal" },
];

export const FIELD_PATH_SET = new Set(FIELD_PATHS.map((f) => f.path));

/* ----------------------------- coercers ----------------------------- */

function asString(v: AnswerValue): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v).trim();
}

function asStringArray(v: AnswerValue): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return String(v)
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function asNumber(v: AnswerValue): number | undefined {
  if (typeof v === "number") return v;
  const n = parseFloat(asString(v));
  return Number.isFinite(n) ? n : undefined;
}

function asBool(v: AnswerValue): boolean {
  if (typeof v === "boolean") return v;
  return /^(yes|true|on|emoji|with emoji)/i.test(asString(v));
}

/** Merge new string items into an existing list, de-duped case-insensitively. */
function mergeList(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map((s) => s.toLowerCase()));
  const out = [...existing];
  for (const item of incoming) {
    if (!seen.has(item.toLowerCase())) {
      seen.add(item.toLowerCase());
      out.push(item);
    }
  }
  return out;
}

const LOGO_KEYWORDS: { type: LogoType; match: RegExp }[] = [
  { type: "wordmark", match: /word ?mark|the name, styled|name styled/i },
  { type: "lettermark", match: /letter ?mark|monogram|initials/i },
  { type: "pictorial", match: /pictorial|a picture|symbol\b|icon/i },
  { type: "abstract", match: /abstract|symbolic shape/i },
  { type: "mascot", match: /mascot|character/i },
  { type: "combination", match: /combination|symbol \+ name|together/i },
  { type: "emblem", match: /emblem|badge|seal|crest/i },
];

function toLogoTypes(items: string[]): LogoType[] {
  const out: LogoType[] = [];
  for (const raw of items) {
    const hit = LOGO_KEYWORDS.find((k) => k.match.test(raw));
    if (hit && !out.includes(hit.type)) out.push(hit.type);
  }
  return out;
}

function pickEnum<T extends string>(v: AnswerValue, options: T[]): T | undefined {
  const s = asString(v).toLowerCase();
  return options.find((o) => s.includes(o.toLowerCase()));
}

const PALETTE_ROLES = ["primary", "secondary", "accent", "neutral"] as const;

/* ----------------------------- writer ----------------------------- */

/**
 * Write `value` into the field at `path`, returning a new BrandDataObject.
 * Unknown paths are ignored (logged by the caller if needed).
 */
export function writeField(bd: BrandDataObject, path: string, value: AnswerValue): BrandDataObject {
  const next: BrandDataObject = structuredClone(bd);

  switch (path) {
    case "business.type": {
      // Any non-empty answer resolves to a type ("both"/anything else → hybrid).
      const s = asString(value).toLowerCase();
      next.business.type = /product/.test(s)
        ? "product"
        : /service/.test(s)
          ? "service"
          : s
            ? "hybrid"
            : undefined;
      break;
    }
    case "business.description":
      next.business.description = asString(value);
      break;
    case "business.offerings": {
      const names = asStringArray(value);
      const existing = new Set(next.business.offerings.map((o) => o.name.toLowerCase()));
      for (const name of names) {
        if (!existing.has(name.toLowerCase())) {
          next.business.offerings.push({ name, priority: next.business.offerings.length === 0 ? "core" : "secondary" });
          existing.add(name.toLowerCase());
        }
      }
      break;
    }
    case "business.stage":
      next.business.stage = asString(value);
      break;
    case "business.model":
      next.business.model = asString(value);
      break;

    case "audience.segments": {
      const names = asStringArray(value);
      const existing = new Set(next.audience.segments.map((s) => s.name.toLowerCase()));
      for (const name of names) {
        if (!existing.has(name.toLowerCase())) {
          next.audience.segments.push({ name });
          existing.add(name.toLowerCase());
        }
      }
      break;
    }
    case "audience.b2x":
      next.audience.b2x = pickEnum(value, ["B2B", "B2C", "both"]);
      break;
    case "audience.jobsToBeDone":
      next.audience.jobsToBeDone = mergeList(next.audience.jobsToBeDone, asStringArray(value));
      break;

    case "goals.primary":
      next.goals.primary = asString(value);
      break;
    case "goals.metrics":
      next.goals.metrics = mergeList(next.goals.metrics, asStringArray(value));
      break;
    case "goals.blocker":
      next.goals.blocker = asString(value);
      break;

    case "market.competitors": {
      const names = asStringArray(value);
      const existing = new Set(next.market.competitors.map((c) => c.name.toLowerCase()));
      for (const name of names) {
        if (!existing.has(name.toLowerCase())) {
          next.market.competitors.push({ name, sentiment: "admire" });
          existing.add(name.toLowerCase());
        }
      }
      break;
    }
    case "market.positioning":
      for (const v of asStringArray(value)) {
        next.market.positioning.push({ axis: "positioning", value: v });
      }
      break;

    case "brand.personality": {
      const traits = asStringArray(value);
      const existing = new Set(next.brand.personality.map((p) => p.trait.toLowerCase()));
      for (const trait of traits) {
        if (!existing.has(trait.toLowerCase())) {
          next.brand.personality.push({ trait, score: 100 });
          existing.add(trait.toLowerCase());
        }
      }
      // adjectives also feed keywords
      next.brand.keywords = mergeList(next.brand.keywords, traits);
      break;
    }
    case "brand.archetype":
      next.brand.archetype = asString(value);
      break;
    case "brand.keywords":
      next.brand.keywords = mergeList(next.brand.keywords, asStringArray(value));
      break;

    case "voice.formality":
      next.voice.formality = asNumber(value);
      break;
    case "voice.person":
      next.voice.person = pickEnum(value, ["we", "you", "mixed"]) ?? (asString(value) ? "mixed" : undefined);
      break;
    case "voice.emoji":
      next.voice.emoji = asBool(value);
      break;
    case "voice.examples":
      next.voice.examples = mergeList(next.voice.examples, asStringArray(value));
      break;

    case "logo.preferredTypes":
      next.logo.preferredTypes = Array.from(new Set([...next.logo.preferredTypes, ...toLogoTypes(asStringArray(value))]));
      break;
    case "logo.avoid":
      next.logo.avoid = Array.from(new Set([...next.logo.avoid, ...toLogoTypes(asStringArray(value))]));
      break;
    case "logo.notes":
      next.logo.notes = asString(value);
      break;

    case "color.locked":
      for (const hex of asStringArray(value)) {
        if (!next.color.locked.some((c) => c.hex.toLowerCase() === hex.toLowerCase())) {
          next.color.locked.push({ hex });
        }
      }
      break;
    case "color.direction":
      next.color.direction = asString(value);
      break;
    case "color.chosenPalette": {
      const hexes = asStringArray(value);
      hexes.forEach((hex, i) => {
        if (!next.color.chosenPalette.some((c) => c.hex.toLowerCase() === hex.toLowerCase())) {
          next.color.chosenPalette.push({ hex, role: PALETTE_ROLES[Math.min(i, PALETTE_ROLES.length - 1)] });
        }
      });
      break;
    }
    case "color.productColors":
      next.color.productColors = next.color.productColors ?? [];
      for (const hex of asStringArray(value)) {
        if (!next.color.productColors.some((c) => c.hex.toLowerCase() === hex.toLowerCase())) {
          next.color.productColors.push({ hex });
        }
      }
      break;
    case "color.lightDark":
      next.color.lightDark = pickEnum(value, ["light", "dark", "both"]);
      break;

    case "type.displayFeel":
      next.type.displayFeel = asString(value);
      break;
    case "type.bodyFeel":
      next.type.bodyFeel = asString(value);
      break;

    case "visualStyle.cluster":
      next.visualStyle.cluster = asString(value);
      break;
    case "visualStyle.moodWords":
      next.visualStyle.moodWords = mergeList(next.visualStyle.moodWords, asStringArray(value));
      break;

    case "imagery.mode": {
      // Map common phrasings to the canonical modes, but keep anything else the
      // client picked so the answer is never silently dropped.
      const modes = asStringArray(value).map((raw) => {
        const l = raw.toLowerCase();
        if (/photo|image|real|lifestyle/.test(l)) return "photo";
        if (/illustrat|draw|vector|graphic|cartoon/.test(l)) return "illustration";
        if (/3d|render|three/.test(l)) return "3d";
        return l;
      });
      next.imagery.mode = Array.from(new Set([...next.imagery.mode, ...modes]));
      break;
    }
    case "imagery.iconStyle":
      next.imagery.iconStyle = asString(value);
      break;
    case "imagery.mood":
      next.imagery.mood = asString(value);
      break;

    case "surfaces": {
      const kinds = asStringArray(value);
      const existing = new Set(next.surfaces.map((s) => s.kind.toLowerCase()));
      for (const kind of kinds) {
        if (!existing.has(kind.toLowerCase())) {
          next.surfaces.push({ kind, screens: [], components: [] });
          existing.add(kind.toLowerCase());
        }
      }
      break;
    }
    case "product.packagingNeeds":
      next.product = next.product ?? { packagingNeeds: [] };
      next.product.packagingNeeds = mergeList(next.product.packagingNeeds, asStringArray(value));
      break;

    case "constraints.accessibility":
      next.constraints.accessibility = asString(value);
      break;
    case "constraints.localization":
      next.constraints.localization = asString(value);
      break;
    case "constraints.stack":
      next.constraints.stack = asString(value);
      break;
    case "constraints.cms":
      next.constraints.cms = asString(value);
      break;
    case "constraints.compliance":
      next.constraints.compliance = asString(value);
      break;

    default:
      // Unknown / unmapped path — leave brand data untouched.
      break;
  }

  return next;
}
