/**
 * Type "personality" specimens for the visual typography picker (blueprint §5.3).
 * The client picks the *feel* (not a font name); the chosen feel maps to real
 * font stacks during token derivation (lib/tokens.ts deriveFamily matches these
 * names). Fonts are loaded via a <link> in app/layout.tsx.
 */
export interface TypeFeel {
  id: string;
  name: string; // also the stored type.displayFeel / bodyFeel value
  desc: string;
  font: string; // CSS font-family for the specimen
  sample: string;
}

export const TYPE_FEELS: TypeFeel[] = [
  {
    id: "geometric",
    name: "Geometric & modern",
    desc: "Clean, friendly, precise",
    font: "'Poppins', sans-serif",
    sample: "Modern by design",
  },
  {
    id: "grotesk",
    name: "Grotesk & neutral",
    desc: "Swiss, confident, current",
    font: "'Space Grotesk', sans-serif",
    sample: "Confident & clear",
  },
  {
    id: "rounded",
    name: "Friendly & rounded",
    desc: "Approachable and warm",
    font: "'Quicksand', sans-serif",
    sample: "Warm and welcoming",
  },
  {
    id: "serif",
    name: "Editorial & serif",
    desc: "Elegant, trusted, classic",
    font: "'Fraunces', Georgia, serif",
    sample: "Timeless & trusted",
  },
  {
    id: "mono",
    name: "Technical & mono",
    desc: "Precise, techy, exact",
    font: "'JetBrains Mono', monospace",
    sample: "Precise. Technical.",
  },
  {
    id: "bold",
    name: "Bold & expressive",
    desc: "Loud, high-impact",
    font: "'Anton', sans-serif",
    sample: "MAKE IT LOUD",
  },
];

export const feelByName = (name: string | undefined | null) => TYPE_FEELS.find((f) => f.name === name) ?? null;
