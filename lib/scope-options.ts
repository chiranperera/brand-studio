/**
 * Phase 2.5 — Scope & build requirements options.
 *
 * Grounded in 2026 discovery practice: keep a website to 5-10 essential pages
 * tied to the sales process, plus the functional features; and for AI automation
 * "automate four jobs first" (answer questions, capture leads, book appointments,
 * follow up) along an assistive → workflow → autonomous maturity ladder.
 */

export const SURFACE_KINDS = ["Website", "Web app", "Mobile app", "Landing page", "Online store", "Internal tool"];

export const WEBSITE_SECTIONS = [
  "Hero",
  "About",
  "Services / Products",
  "Testimonials / Reviews",
  "Portfolio / Work",
  "Case studies",
  "Pricing",
  "Team",
  "Process / How it works",
  "FAQ",
  "Blog / News",
  "Gallery",
  "Contact",
  "Careers",
];

export const WEBSITE_FEATURES = [
  "Contact form",
  "Online booking / scheduling",
  "Payments / e-commerce",
  "Member login / accounts",
  "Live chat",
  "Search",
  "Multi-language",
  "Newsletter signup",
  "Maps / location",
  "Quote / cost calculator",
  "Blog / CMS",
  "Reviews integration",
  "Social media feeds",
  "Downloadable resources",
];

export const AUTOMATION_NEEDS = [
  "AI chatbot (answer FAQs)",
  "Appointment & calendar booking",
  "Lead capture & qualification",
  "Automated follow-up (email / SMS)",
  "Automated quoting / estimates",
  "Content drafting (social / blog / email)",
  "Reporting & dashboards",
  "Back-office / data entry",
  "Internal staff Q&A assistant",
  "Reviews & reputation management",
  "CRM / email automation",
  "WhatsApp / social DM automation",
];

/** Plain-language automation maturity levels (assistive → workflow → autonomous). */
export const AUTOMATION_LEVELS = [
  "Assistive — answers & suggests, your team decides",
  "Automated workflows — runs multi-step tasks on triggers",
  "Autonomous agent — decides & acts within limits, you oversee",
];

/**
 * The agency's design-deliverables menu — what we can DESIGN & deliver (we don't
 * print). Grouped to educate the client on the full range. Grounded in 2026
 * agency service menus.
 */
export const DELIVERABLE_GROUPS: { label: string; options: string[] }[] = [
  {
    label: "Brand identity",
    options: ["Logo suite", "Brand guidelines", "Business cards & stationery", "Icon / pattern set", "Brand collateral"],
  },
  {
    label: "Web & app",
    options: ["Website design", "Landing pages", "Web app UI", "Mobile app UI", "Design system / UI kit"],
  },
  {
    label: "Social media",
    options: [
      "Social media kit (profiles & banners)",
      "Post & story templates",
      "Social media creatives",
      "Display / banner ads",
    ],
  },
  {
    label: "Email & marketing",
    options: ["Email templates / newsletters", "Email campaign design", "Marketing campaign assets", "Ad creatives"],
  },
  {
    label: "Presentations & docs",
    options: ["Pitch / sales deck", "Reports & one-pagers", "Infographics"],
  },
  {
    label: "Print-ready design (we design, you print)",
    options: ["Brochure / flyer", "Poster", "Packaging", "Menu", "Signage"],
  },
  {
    label: "Motion & video",
    options: ["Motion graphics", "Reels / video templates"],
  },
];

/** Flat list of every deliverable, for validation/suggestions. */
export const ALL_DELIVERABLES = DELIVERABLE_GROUPS.flatMap((g) => g.options);
