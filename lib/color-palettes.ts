/**
 * Curated colour palettes for the visual colour picker (blueprint §5.2, Phase 2).
 * The client/host picks the one that feels right; its colours become
 * color.chosenPalette (which the token derivation reads as the brand ramp).
 */
export type PaletteRole = "primary" | "secondary" | "accent" | "neutral";

export interface Palette {
  id: string;
  name: string;
  mood: string;
  colors: { hex: string; role: PaletteRole }[];
}

export const PALETTES: Palette[] = [
  {
    id: "electric-lime",
    name: "Electric lime",
    mood: "Techy · futuristic · bold",
    colors: [
      { hex: "#C6FF3A", role: "primary" },
      { hex: "#00E5FF", role: "secondary" },
      { hex: "#0A0A0B", role: "neutral" },
      { hex: "#F4F4F5", role: "accent" },
    ],
  },
  {
    id: "trust-blue",
    name: "Trust blue",
    mood: "Professional · calm · reliable",
    colors: [
      { hex: "#2563EB", role: "primary" },
      { hex: "#0EA5E9", role: "secondary" },
      { hex: "#0F172A", role: "neutral" },
      { hex: "#F8FAFC", role: "accent" },
    ],
  },
  {
    id: "premium-gold",
    name: "Premium gold",
    mood: "Luxury · refined · timeless",
    colors: [
      { hex: "#C9A227", role: "primary" },
      { hex: "#8C6D1F", role: "secondary" },
      { hex: "#0A0A0A", role: "neutral" },
      { hex: "#F5F5F0", role: "accent" },
    ],
  },
  {
    id: "fresh-green",
    name: "Fresh green",
    mood: "Natural · eco · wholesome",
    colors: [
      { hex: "#22A06B", role: "primary" },
      { hex: "#84CC16", role: "secondary" },
      { hex: "#052E16", role: "neutral" },
      { hex: "#F0FDF4", role: "accent" },
    ],
  },
  {
    id: "warm-sunset",
    name: "Warm sunset",
    mood: "Energetic · friendly · warm",
    colors: [
      { hex: "#FF5A1F", role: "primary" },
      { hex: "#F59E0B", role: "secondary" },
      { hex: "#7C2D12", role: "neutral" },
      { hex: "#FFF7ED", role: "accent" },
    ],
  },
  {
    id: "playful-purple",
    name: "Playful pop",
    mood: "Fun · creative · youthful",
    colors: [
      { hex: "#A855F7", role: "primary" },
      { hex: "#EC4899", role: "secondary" },
      { hex: "#2E1065", role: "neutral" },
      { hex: "#FAF5FF", role: "accent" },
    ],
  },
  {
    id: "coastal-teal",
    name: "Coastal teal",
    mood: "Clean · modern · serene",
    colors: [
      { hex: "#0D9488", role: "primary" },
      { hex: "#2DD4BF", role: "secondary" },
      { hex: "#134E4A", role: "neutral" },
      { hex: "#F0FDFA", role: "accent" },
    ],
  },
  {
    id: "editorial-mono",
    name: "Editorial mono",
    mood: "Minimal · luxury · editorial",
    colors: [
      { hex: "#111111", role: "primary" },
      { hex: "#E63946", role: "accent" },
      { hex: "#6B7280", role: "secondary" },
      { hex: "#FFFFFF", role: "neutral" },
    ],
  },
  {
    id: "earthy-terracotta",
    name: "Earthy terracotta",
    mood: "Organic · artisanal · grounded",
    colors: [
      { hex: "#C2410C", role: "primary" },
      { hex: "#D97706", role: "secondary" },
      { hex: "#44403C", role: "neutral" },
      { hex: "#FAF6F0", role: "accent" },
    ],
  },
  {
    id: "bold-red",
    name: "Bold red",
    mood: "Strong · sporty · confident",
    colors: [
      { hex: "#DC2626", role: "primary" },
      { hex: "#111111", role: "neutral" },
      { hex: "#6B7280", role: "secondary" },
      { hex: "#F3F4F6", role: "accent" },
    ],
  },
];

export const paletteById = (id: string | null | undefined) => PALETTES.find((p) => p.id === id) ?? null;

/** Best-guess which palette matches a stored chosenPalette (by primary hex). */
export function matchPalette(chosen: { hex: string }[] | undefined): string | null {
  if (!chosen?.length) return null;
  const first = chosen[0].hex.toLowerCase();
  return PALETTES.find((p) => p.colors.some((c) => c.hex.toLowerCase() === first))?.id ?? null;
}
