/**
 * Derive a complete DTCG 2025.10 token set from the captured picks.
 *
 * Discovery captures only the *picks* (locked colours, colour direction, type
 * feel). The export step expands those into a full, usable token set — brand +
 * neutral + semantic ramps, type families + scale, spacing, radius, shadow — so
 * Claude Design receives a complete contract, not just two hex codes.
 */
import type { BrandDataObject } from "./brand-data";

type DimPx = { $type: "dimension"; $value: { value: number; unit: "px" } };
const px = (value: number): DimPx => ({ $type: "dimension", $value: { value, unit: "px" } });
const color = (hex: string, desc?: string) => ({
  $type: "color" as const,
  $value: hex,
  ...(desc ? { $description: desc } : {}),
});

/** Emotional colour directions → a sensible default primary hex. */
const DIRECTION_HEX: { match: RegExp; hex: string }[] = [
  { match: /trust|calm|blue|professional/i, hex: "#2563EB" },
  { match: /energy|bold|red|orange|vibrant/i, hex: "#FF5A1F" },
  { match: /premium|luxury|gold|black/i, hex: "#C9A227" },
  { match: /fresh|natural|green|eco|organic/i, hex: "#22A06B" },
  { match: /tech|future|electric|lime|neon/i, hex: "#C6FF3A" },
  { match: /playful|fun|pink|purple/i, hex: "#A855F7" },
];

function deriveBrandHexes(bd: BrandDataObject): { primary: string; secondary: string } {
  const locked = bd.color.locked.map((c) => c.hex).filter(Boolean);
  const palette = bd.color.chosenPalette.map((c) => c.hex).filter(Boolean);
  const picks = [...locked, ...palette];
  let primary = picks[0];
  let secondary = picks[1];
  if (!primary) {
    const dir = DIRECTION_HEX.find((d) => d.match.test(bd.color.direction ?? ""));
    primary = dir?.hex ?? "#C6FF3A";
  }
  if (!secondary) secondary = "#00E5FF";
  return { primary, secondary };
}

/** Type-feel keyword → a real font stack. */
const TYPE_FAMILIES: { match: RegExp; family: string[] }[] = [
  { match: /geometric|modern/i, family: ["Clash Display", "Poppins", "sans-serif"] },
  { match: /grotesk|neutral|swiss/i, family: ["Space Grotesk", "Inter", "sans-serif"] },
  { match: /friendly|rounded|soft/i, family: ["Quicksand", "Nunito", "sans-serif"] },
  { match: /editorial|serif|elegant|classic/i, family: ["Fraunces", "Georgia", "serif"] },
  { match: /technical|mono|code/i, family: ["JetBrains Mono", "monospace"] },
  { match: /bold|expressive|display/i, family: ["Clash Display", "Anton", "sans-serif"] },
];

function deriveFamily(feel: string | undefined, fallback: string[]): string[] {
  if (!feel) return fallback;
  return TYPE_FAMILIES.find((t) => t.match.test(feel))?.family ?? fallback;
}

/** Neutral ramp tuned for a light or dark base. */
function neutralRamp(lightDark: BrandDataObject["color"]["lightDark"]) {
  const darkFirst = lightDark === "dark" || lightDark === "both" || !lightDark;
  const ramp = darkFirst
    ? ["#0A0A0B", "#141416", "#1C1C20", "#2A2A30", "#3A3A42", "#5A5A63", "#8A8A93", "#B5B5BC", "#D8D8DD", "#FFFFFF"]
    : ["#FFFFFF", "#F7F7F8", "#EFEFF1", "#E3E3E6", "#D0D0D5", "#A8A8B0", "#74747C", "#48484F", "#262629", "#0A0A0B"];
  const out: Record<string, ReturnType<typeof color>> = {};
  ramp.forEach((hex, i) => (out[String(i * 100)] = color(hex)));
  return out;
}

export function deriveTokens(bd: BrandDataObject) {
  const { primary, secondary } = deriveBrandHexes(bd);
  const display = deriveFamily(bd.type.displayFeel, ["Clash Display", "sans-serif"]);
  const body = deriveFamily(bd.type.bodyFeel, ["Inter", "sans-serif"]);

  return {
    $schema: "https://design-tokens.org/tr/2025.10/format/",
    color: {
      brand: {
        primary: color(
          primary,
          `${bd.color.paletteName ? `${bd.color.paletteName} — ` : ""}Primary brand accent${
            bd.color.direction ? ` (${bd.color.direction})` : ""
          }`
        ),
        secondary: color(secondary, "Secondary accent"),
      },
      neutral: neutralRamp(bd.color.lightDark),
      semantic: {
        success: color("#22C55E"),
        danger: color("#EF4444"),
        warning: color("#F59E0B"),
        info: color("#3B82F6"),
      },
    },
    font: {
      family: {
        display: { $type: "fontFamily" as const, $value: display },
        body: { $type: "fontFamily" as const, $value: body },
        mono: { $type: "fontFamily" as const, $value: ["JetBrains Mono", "monospace"] },
      },
      scale: {
        display: px(72),
        h1: px(48),
        h2: px(36),
        h3: px(28),
        h4: px(22),
        body: px(16),
        small: px(14),
        caption: px(12),
      },
    },
    spacing: {
      "1": px(4),
      "2": px(8),
      "3": px(12),
      "4": px(16),
      "6": px(24),
      "8": px(32),
      "12": px(48),
      "16": px(64),
    },
    radius: {
      sm: px(4),
      md: px(8),
      lg: px(16),
      xl: px(24),
      full: px(9999),
    },
    shadow: {
      card: {
        $type: "shadow" as const,
        $value: {
          color: "#00000022",
          offsetX: { value: 0, unit: "px" },
          offsetY: { value: 8, unit: "px" },
          blur: { value: 24, unit: "px" },
          spread: { value: 0, unit: "px" },
        },
      },
    },
  };
}

export type DesignTokens = ReturnType<typeof deriveTokens>;
