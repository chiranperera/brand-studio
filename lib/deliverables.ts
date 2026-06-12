/**
 * The agency's design-deliverables catalog — categories → items, each with a
 * plain description and a "mockup shape" used to render a stylised, on-brand
 * example so the client sees what each deliverable is.
 *
 * Grounded in 2026 agency/brand-package menus (Shopify, Brand Blocks, We Are
 * Tenet, Superside). Names are kept stable so saved data stays compatible.
 */
export type MockupShape =
  | "logo"
  | "doc"
  | "moodboard"
  | "card"
  | "pattern"
  | "browser"
  | "phone"
  | "uikit"
  | "social"
  | "banner"
  | "email"
  | "grid"
  | "deck"
  | "infographic"
  | "brochure"
  | "poster"
  | "package"
  | "menu"
  | "motion"
  | "merch";

export interface Deliverable {
  name: string;
  desc: string;
  shape: MockupShape;
}

export interface DeliverableCategory {
  id: string;
  label: string;
  items: Deliverable[];
}

export const DELIVERABLE_CATEGORIES: DeliverableCategory[] = [
  {
    id: "brand",
    label: "Brand identity",
    items: [
      { name: "Logo suite", desc: "Primary, stacked, mark & mono versions", shape: "logo" },
      { name: "Brand guidelines", desc: "The rulebook: logo, colour, type, voice", shape: "doc" },
      { name: "Brand strategy & moodboard", desc: "Positioning, mood & direction", shape: "moodboard" },
      { name: "Business cards & stationery", desc: "Cards, letterhead, signature", shape: "card" },
      { name: "Icon / pattern set", desc: "Custom icons & brand patterns", shape: "pattern" },
      { name: "Brand collateral", desc: "Folders, badges, branded extras", shape: "doc" },
    ],
  },
  {
    id: "web",
    label: "Web & app",
    items: [
      { name: "Website design", desc: "Full marketing site, designed", shape: "browser" },
      { name: "Landing pages", desc: "Focused campaign / launch pages", shape: "browser" },
      { name: "Web app UI", desc: "Dashboard & in-product screens", shape: "browser" },
      { name: "Mobile app UI", desc: "iOS / Android app screens", shape: "phone" },
      { name: "Design system / UI kit", desc: "Reusable components & tokens", shape: "uikit" },
    ],
  },
  {
    id: "social",
    label: "Social media",
    items: [
      { name: "Social media kit (profiles & banners)", desc: "Profiles, covers, highlights", shape: "social" },
      { name: "Post & story templates", desc: "Reusable, on-brand templates", shape: "social" },
      { name: "Social media creatives", desc: "Ready-to-post graphics", shape: "social" },
      { name: "Display / banner ads", desc: "Google / display ad sizes", shape: "banner" },
    ],
  },
  {
    id: "marketing",
    label: "Email & marketing",
    items: [
      { name: "Email templates / newsletters", desc: "On-brand email layouts", shape: "email" },
      { name: "Email campaign design", desc: "Multi-email campaign sets", shape: "email" },
      { name: "Marketing campaign assets", desc: "Cross-channel campaign kit", shape: "grid" },
      { name: "Ad creatives", desc: "Paid social / search creatives", shape: "banner" },
    ],
  },
  {
    id: "docs",
    label: "Presentations & docs",
    items: [
      { name: "Pitch / sales deck", desc: "Investor or sales presentation", shape: "deck" },
      { name: "Reports & one-pagers", desc: "Branded documents & PDFs", shape: "doc" },
      { name: "Infographics", desc: "Data made visual", shape: "infographic" },
    ],
  },
  {
    id: "print",
    label: "Print-ready design",
    items: [
      { name: "Brochure / flyer", desc: "Tri-fold / single-sheet design", shape: "brochure" },
      { name: "Poster", desc: "Event / promo poster", shape: "poster" },
      { name: "Packaging", desc: "Product packaging & labels", shape: "package" },
      { name: "Menu", desc: "Restaurant / café menu", shape: "menu" },
      { name: "Signage", desc: "Storefront / event signage", shape: "poster" },
    ],
  },
  {
    id: "motion",
    label: "Motion & merch",
    items: [
      { name: "Motion graphics", desc: "Animated logo & graphics", shape: "motion" },
      { name: "Reels / video templates", desc: "Short-form video templates", shape: "motion" },
      { name: "Merch / apparel", desc: "T-shirts, mugs, swag designs", shape: "merch" },
    ],
  },
];

export const ALL_DELIVERABLES = DELIVERABLE_CATEGORIES.flatMap((c) => c.items.map((i) => i.name));

/** Look up a deliverable's metadata by name. */
const BY_NAME = new Map(DELIVERABLE_CATEGORIES.flatMap((c) => c.items.map((i) => [i.name, i] as const)));
export const deliverableByName = (name: string) => BY_NAME.get(name) ?? null;
