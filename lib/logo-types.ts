/**
 * The 7 logo types for the visual logo-type picker (blueprint §5.1).
 * Descriptions follow the VistaPrint "types of logos" framing. Each type shows
 * real example logos + in-use mockups (assets in public/logo-types/<type>/).
 */
import type { LogoType } from "./brand-data";

export interface LogoExample {
  brand: string;
  logo: string;
  mockup: string;
}

export interface LogoTypeInfo {
  slug: LogoType;
  name: string; // technical name
  plain: string; // plain-language label for clients
  summary: string; // 2-3 sentence description
  bestFor: string; // one-line "when to use"
  examples: LogoExample[];
}

const ex = (type: string, brand: string, label: string): LogoExample => ({
  brand: label,
  logo: `/logo-types/${type}/${brand}-logo.jpeg`,
  mockup: `/logo-types/${type}/${brand}-mockup.jpeg`,
});

export const LOGO_TYPES: LogoTypeInfo[] = [
  {
    slug: "wordmark",
    name: "Wordmark",
    plain: "The name, styled",
    summary:
      "A wordmark turns the business name itself into the logo, set in distinctive, custom typography. There's no separate symbol — the name is the mark, so the lettering does all the work and builds name recognition fast.",
    bestFor: "Short, distinctive names you want people to read and remember.",
    examples: [
      ex("wordmark", "coca-cola", "Coca-Cola"),
      ex("wordmark", "google", "Google"),
      ex("wordmark", "netflix", "Netflix"),
    ],
  },
  {
    slug: "lettermark",
    name: "Lettermark",
    plain: "Initials / monogram",
    summary:
      "A lettermark reduces a long name to its initials, set as a clean, legible typographic mark. It's compact, easy to recognise at small sizes, and keeps a mouthful of a name simple.",
    bestFor: "Long or multi-word names that are hard to say in full.",
    examples: [
      ex("lettermark", "hbo", "HBO"),
      ex("lettermark", "lg", "LG"),
      ex("lettermark", "nasa", "NASA"),
    ],
  },
  {
    slug: "pictorial",
    name: "Pictorial mark",
    plain: "A picture / symbol",
    summary:
      "A pictorial mark is a recognisable icon that stands in for the brand — no words needed. The symbol carries all the meaning, so it's language-independent, but usually needs exposure before it stands alone.",
    bestFor: "Brands aiming for instant, global recognition from one simple icon.",
    examples: [
      ex("pictorial", "apple", "Apple"),
      ex("pictorial", "target", "Target"),
      ex("pictorial", "twitter", "Twitter"),
    ],
  },
  {
    slug: "abstract",
    name: "Abstract mark",
    plain: "A symbolic shape",
    summary:
      "An abstract mark is a non-literal geometric form that represents the brand through shape, colour and movement rather than a recognisable object. It conveys an idea or feeling without being tied to a literal picture — distinctive and ownable.",
    bestFor: "A unique, modern symbol that conveys a concept, not a literal thing.",
    examples: [
      ex("abstract", "nike", "Nike"),
      ex("abstract", "airbnb", "Airbnb"),
      ex("abstract", "mastercard", "Mastercard"),
    ],
  },
  {
    slug: "combination",
    name: "Combination mark",
    plain: "Symbol + name together",
    summary:
      "A combination mark pairs a symbol with the business name, giving you the recognition of an icon and the clarity of the name together. The two can lock up as one or be used separately as the brand grows — the most flexible, safest choice.",
    bestFor: "Most businesses — especially new brands that need the name spelled out.",
    examples: [
      ex("combination", "burger-king", "Burger King"),
      ex("combination", "lacoste", "Lacoste"),
      ex("combination", "puma", "Puma"),
    ],
  },
  {
    slug: "mascot",
    name: "Mascot",
    plain: "A character",
    summary:
      "A mascot logo is an illustrated character that becomes the face and personality of the brand. It's friendly, memorable and great for storytelling — adding warmth and a human touch.",
    bestFor: "Brands that want to feel approachable and fun — food, sports, family.",
    examples: [
      ex("mascot", "duolingo", "Duolingo"),
      ex("mascot", "kfc", "KFC"),
      ex("mascot", "michelin", "Michelin"),
    ],
  },
  {
    slug: "emblem",
    name: "Emblem",
    plain: "A badge / seal",
    summary:
      "An emblem places the name inside a symbol — a badge, crest or seal — so text and icon form one fixed shape. It feels traditional, established and authoritative, though fine detail can be harder to read at very small sizes.",
    bestFor: "Brands wanting a heritage, official or premium feel.",
    examples: [
      ex("emblem", "starbucks", "Starbucks"),
      ex("emblem", "harley-davidson", "Harley-Davidson"),
      ex("emblem", "harvard", "Harvard"),
    ],
  },
];
