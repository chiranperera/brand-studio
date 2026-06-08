/**
 * Standard fallback question bank (no-key mode). Ported from the old tool and
 * extended with the brand & design track. Every question hard-codes its `field`
 * so the same mapping layer fills the BrandDataObject without the AI.
 */
import type { Question } from "./question-engine";

export const BANK: Question[] = [
  // Business & Brand
  { section: "Business & Brand", question: "Are you a product, a service, or both?", inputType: "select", options: ["Product", "Service", "Both (hybrid)"], field: "business.type" },
  { section: "Business & Brand", question: "In one sentence, what does your business do?", inputType: "textarea", field: "business.description" },
  { section: "Business & Brand", question: "What do you sell? (pick all that apply)", inputType: "multiselect", options: ["Physical products", "Digital products", "Consulting", "Subscriptions", "Services", "Courses/education"], field: "business.offerings" },
  { section: "Business & Brand", question: "What stage is the business at?", inputType: "select", options: ["Just starting", "Established", "Scaling up", "Rebranding"], field: "business.stage" },

  // Target Audience
  { section: "Target Audience", question: "Who do you serve? (pick all that apply)", inputType: "multiselect", options: ["Consumers", "Small businesses", "Enterprises", "Professionals", "Young adults", "Families"], field: "audience.segments" },
  { section: "Target Audience", question: "Is this mostly B2B or B2C?", inputType: "select", options: ["B2B", "B2C", "Both"], field: "audience.b2x" },
  { section: "Target Audience", question: "What are they trying to get done? (pick all that apply)", inputType: "multiselect", options: ["Save time", "Save money", "Look professional", "Grow revenue", "Solve a problem", "Feel confident"], field: "audience.jobsToBeDone" },

  // Goals & Success
  { section: "Goals & Success", question: "What's the #1 thing this project must achieve?", inputType: "textarea", field: "goals.primary" },
  { section: "Goals & Success", question: "How will we measure success? (pick all that apply)", inputType: "multiselect", options: ["More leads", "More sales", "More bookings", "Sign-ups", "Brand awareness", "Time saved"], field: "goals.metrics" },
  { section: "Goals & Success", question: "What's stopping you from that today?", inputType: "textarea", field: "goals.blocker" },

  // Brand Personality & Voice
  { section: "Brand Personality & Voice", question: "How should the brand feel? (pick all that apply)", inputType: "multiselect", options: ["Premium", "Friendly", "Bold", "Minimal", "Playful", "Trustworthy", "Technical", "Modern"], field: "brand.personality" },
  { section: "Brand Personality & Voice", question: "Which archetype fits best?", inputType: "select", options: ["Creator", "Hero", "Sage", "Explorer", "Rebel/Outlaw", "Caregiver", "Everyman", "Magician", "Ruler", "Lover", "Jester", "Innocent"], field: "brand.archetype" },
  { section: "Brand Personality & Voice", question: "How should you speak to customers?", inputType: "select", options: ["We (the company)", "You (the customer)", "Mixed"], field: "voice.person" },
  { section: "Brand Personality & Voice", question: "Emoji in your communications?", inputType: "select", options: ["Yes, emoji welcome", "No emoji"], field: "voice.emoji" },

  // Logo & Identity
  { section: "Logo & Identity", question: "Which logo style are you drawn to? (pick 1–2)", inputType: "multiselect", options: ["The name, styled (wordmark)", "Initials / monogram (lettermark)", "A picture/symbol (pictorial)", "A symbolic shape (abstract)", "A character (mascot)", "Symbol + name together (combination)", "A badge/seal (emblem)"], field: "logo.preferredTypes" },
  { section: "Logo & Identity", question: "Any logo styles to avoid?", inputType: "multiselect", options: ["The name, styled (wordmark)", "A character (mascot)", "A badge/seal (emblem)", "A picture/symbol (pictorial)"], field: "logo.avoid" },
  { section: "Logo & Identity", question: "What should the logo convey?", inputType: "textarea", field: "logo.notes" },

  // Color & Typography
  { section: "Color & Typography", question: "What emotional direction for colour?", inputType: "select", options: ["Trust / calm (blues)", "Energy / bold (reds, orange)", "Premium (black, gold)", "Fresh / natural (greens)", "Techy / futuristic (neon)", "Playful (pink, purple)"], field: "color.direction" },
  { section: "Color & Typography", question: "Any brand colours you must keep? (hex or names)", inputType: "text", field: "color.locked" },
  { section: "Color & Typography", question: "Light or dark first?", inputType: "select", options: ["Light", "Dark", "Both"], field: "color.lightDark" },
  { section: "Color & Typography", question: "How should the headlines feel?", inputType: "select", options: ["Geometric & modern", "Grotesk & neutral", "Friendly & rounded", "Editorial & serif", "Technical & mono", "Bold & expressive"], field: "type.displayFeel" },
  { section: "Color & Typography", question: "How should the body text feel?", inputType: "select", options: ["Clean & neutral", "Friendly & rounded", "Editorial & serif", "Technical & mono"], field: "type.bodyFeel" },

  // Visual Style & Imagery
  { section: "Visual Style & Imagery", question: "Which overall style feels like you?", inputType: "select", options: ["Minimal-luxury", "Playful-bold", "Techy-futuristic", "Organic-warm", "Editorial-classic"], field: "visualStyle.cluster" },
  { section: "Visual Style & Imagery", question: "Three words that describe the look you want?", inputType: "text", field: "visualStyle.moodWords" },
  { section: "Visual Style & Imagery", question: "Imagery direction? (pick all that apply)", inputType: "multiselect", options: ["Photo", "Illustration", "3D"], field: "imagery.mode" },
  { section: "Visual Style & Imagery", question: "Icon style?", inputType: "select", options: ["Line", "Solid", "Duotone"], field: "imagery.iconStyle" },

  // Surfaces & Screens
  { section: "Surfaces & Screens", question: "What surfaces do you need designed? (pick all that apply)", inputType: "multiselect", options: ["Website", "Web app", "Mobile app", "Social kit", "Packaging", "Pitch deck", "Email"], field: "surfaces" },

  // Constraints & Practicalities
  { section: "Constraints & Practicalities", question: "Any accessibility or compliance needs?", inputType: "text", field: "constraints.accessibility" },
  { section: "Constraints & Practicalities", question: "Any tech stack or CMS constraints?", inputType: "text", field: "constraints.stack" },
  { section: "Constraints & Practicalities", question: "Multiple languages or RTL?", inputType: "text", field: "constraints.localization" },
];
