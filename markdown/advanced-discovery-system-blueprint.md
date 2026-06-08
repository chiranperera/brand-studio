# The Discovery Engine — Blueprint for an AI Solopreneur Branding System

> **What this is.** A research-backed upgrade blueprint that turns your current text-only discovery tool into an **advanced, visual, interactive, multi-device discovery engine** — the front door of a one-person AI agency that runs from the first client conversation all the way to a finished design system, brand guidelines, website, social kit, and product packaging, with automation everywhere a human isn't strictly needed.
>
> **Who builds it.** You hand this to Claude Code to implement. This document is the architecture, the question/elicitation design, the data model, the live-session design, the automation pipeline, and a phased roadmap.
>
> **Grounded in 2026 practice.** See Sources at the end. Key external anchors: the W3C Design Tokens spec reached its **first stable version (2025.10)** — so structured token output is now a real standard; modern design research says **"show, don't ask"** (visual preference testing beats written description); and the 2026 agency model is the **"centaur"** — human sets vision and guardrails, agents execute.

---

## 1. The core reframe

Your current tool is a **smart interviewer that produces prose.** The upgrade is a **discovery engine that produces structured, visual, machine-usable brand data** — and lets a non-designer client *see and choose* instead of *describe*.

Three shifts define the whole project:

1. **From telling to showing.** A client can't describe a logo style in words, but they can point at one. Every design question becomes a **visual choice** (logo-type cards, palette swatches, type specimens, mood pairs), not a text box. Research is blunt on this: *"Written descriptions of visual preferences are unreliable… a folder of screenshots tells you more in seconds than paragraphs of text."*
2. **From one screen to two.** The session runs **live across devices** — you drive on your laptop, the client follows and taps choices on their phone/tablet, in real time, under permission levels. This is the "interactive conversation" you described.
3. **From a transcript to a seed.** The session ends by emitting a **structured Brand Data Object** (typed JSON + DTCG design tokens) that drops directly into your design-system generator (the VOLT prompt) and every downstream generator — no manual re-typing. This is the bridge that makes the rest of the pipeline automatable.

Everything below serves those three shifts.

---

## 2. Design principles (from 2026 research)

- **Show, don't ask.** Default every aesthetic question to a visual picker with real examples; keep free-text rare and reserved for stories (the "why").
- **Translate the jargon.** The client doesn't speak "wordmark," "kerning," or "semantic color." Each visual option carries a **plain-language label + a one-line "what this means for you."** You ask "Which of these feels like *you*?", not "Which logo taxonomy do you prefer?"
- **Capture the *why*, not just the *what*.** After a pick, ask a short follow-up ("what drew you to it?") and **store descriptive words** — these adjectives become brand-personality tokens.
- **Always collect references.** A first-class step for uploading inspiration (logos, sites, competitors, Pinterest, packaging photos) — the single highest-signal input for design.
- **Adapt by industry, enforce by checklist.** Keep your Gemini adaptive engine, but gate completion on **required structured fields**, not a question count.
- **Centaur, not autopilot.** Automate aggressively, but put **human approval gates** at the moments that need taste and client trust (final logo direction, brief sign-off, anything client-facing).
- **One source of truth.** Tokens follow the **DTCG 2025.10** standard so they flow into Figma, code, and AI generators without translation.

---

## 3. System architecture (the big picture)

```
        ┌──────────────────────── LIVE DISCOVERY SESSION ────────────────────────┐
        │  HOST (you, laptop)  ⇄  realtime sync  ⇄  CLIENT (phone/tablet)          │
        │  • drives the flow      (presence,         • sees current question        │
        │  • sees everything       cursors,          • taps visual choices          │
        │  • can override          live state)       • uploads references           │
        └───────────────────────────────┬───────────────────────────────────────-─┘
                                         │ every answer → structured + saved live
                                         ▼
                    ┌─────────────── BRAND DATA OBJECT (typed JSON) ───────────────┐
                    │  business · audience · goals · brand · voice · logo · color · │
                    │  type · imagery · surfaces · products · packaging · budget    │
                    └───────────────┬───────────────────────────────┬──────────────┘
                                    ▼                               ▼
                     DTCG design tokens (.tokens.json)     Strategy brief / proposal
                                    │                               │
        ┌───────────────────────────┴─────────── DOWNSTREAM GENERATORS ───────────┐
        │  Design System (VOLT)  ·  Logo concepts  ·  Brand guidelines  ·          │
        │  Website (Next.js)  ·  Social kit  ·  Packaging  ·  Slide deck           │
        │              each with a HUMAN APPROVAL GATE before client sees it       │
        └─────────────────────────────────────────────────────────────────────────┘
```

The discovery engine is the part this blueprint specifies in full. The downstream generators are §8.

---

## 4. The discovery modules (what you collect)

Two tracks. **Strategy** (you mostly have this — keep it) and **Brand & Design** (the new, mostly-visual track). Every module lists the **structured fields** it must fill before the session can complete.

### Track A — Strategy & Business (refine your existing 11 topics)
1. **Business core** — `business_type` (product / service / hybrid — *asked explicitly and early*), what they sell, named products/services, stage, model.
2. **Audience** — segments, B2B/B2C, demographics + psychographics, jobs-to-be-done.
3. **Goals & success metrics** — the #1 outcome, how it's measured, current blocker.
4. **Market & competitors** — named competitors, what they admire/avoid, positioning (premium↔accessible, niche↔mass).
5. **Current presence** — site URL, socials, what works / what doesn't.
6. **Budget, timeline, decision-makers.**
7. **Future vision & scalability.**

### Track B — Brand & Design (new, visual-first)
8. **Brand personality & archetype** — adjective sliders + a 12-archetype visual picker (Hero, Sage, Creator, Outlaw…). Output: personality tokens.
9. **Voice & tone** — pick sample sentences ("formal ↔ casual," "we ↔ you," emoji or not) → tone profile with examples.
10. **Logo direction** — the **7 logo-type picker** (see §5.1).
11. **Color** — brand colors, color psychology, light/dark, "this-or-that" palettes (see §5.2). For product brands: **product/packaging colors** vs **brand colors** captured separately.
12. **Typography feel** — specimen cards (geometric / grotesk / serif / mono / display), not font names (see §5.3).
13. **Visual style & mood** — paired-image preference test + descriptive-word capture (see §5.4).
14. **Imagery & iconography** — photography vs illustration vs 3D; icon style (line/solid/duotone); warm/cool/B&W/grain.
15. **Surfaces to design** — website, web app, mobile app, social, packaging, deck, email — and **key screens/flows per surface** + components needed.
16. **Product & packaging** (product brands) — SKUs, materials, formats, dieline needs, sustainability cues, shelf context.
17. **Inspiration & references** — upload + URL ingestion (first-class; see §6).
18. **Constraints** — accessibility, localization/RTL, tech stack, CMS, compliance.

> Completion gate = "every required field across modules 1–18 has a value." The category rail you already have becomes a **completeness meter** ("Brand colors: still needed").

---

## 5. Visual elicitation library (the heart of the upgrade)

This is exactly the "show him logo types, let him pick" capability you asked for. Each is a reusable component.

### 5.1 Logo-type picker (the 7 industry-standard types)
Show seven cards, each with a recognizable example silhouette + plain label + when-to-use:

| Type | Plain label shown to client | One-liner |
|---|---|---|
| **Wordmark** | "The name, styled" | Full name in a custom font (Google, Coca-Cola). Best for short, memorable names. |
| **Lettermark** | "Initials / monogram" | Initials only (IBM, HP). Good for long names. |
| **Pictorial mark** | "A picture/symbol" | A literal icon (Apple, the old Twitter bird). Needs recognition to stand alone. |
| **Abstract mark** | "A symbolic shape" | A non-literal form representing an idea (Nike swoosh). |
| **Mascot** | "A character" | An illustrated face for the brand (KFC Colonel). Friendly, great for food/sports/family. |
| **Combination mark** | "Symbol + name together" | Icon + text (most versatile, safest default). |
| **Emblem** | "A badge/seal" | Name inside a crest (Starbucks, Harley). Traditional, authoritative; harder to shrink. |

Interaction: client taps the 1–2 they're drawn to → short "why" → optionally rank. You can show **real reference logos** per type. Output: `logo.preferred_types[]`, `logo.notes`.

### 5.2 Color elicitation (three light steps, no theory)
- **Step 1 — Brand colors they already have / must keep** (color picker + hex, or "none yet").
- **Step 2 — Emotional direction** — pick from psychology-tagged swatches ("trust/calm — blues," "energy/bold — reds/orange," "premium — black/gold," "fresh/natural — greens"). Each swatch shows the *feeling*, not the hex.
- **Step 3 — "This or that" palettes** — show 2–3 full palettes at a time (generated to match their archetype), client taps the one that feels right; repeat to converge. (Preference testing: differences must be obvious to a non-designer.)
- **Product brands:** repeat for **packaging/product colors** separately — these often differ from the digital brand palette.
Output: `color.locked[]`, `color.direction`, `color.chosen_palette`, plus auto-derived neutrals + semantic colors.

### 5.3 Typography feel (specimens, not font names)
Show large specimen cards labelled by *personality*, not family: "Geometric & modern," "Friendly & rounded," "Editorial & serif," "Technical & mono," "Bold & expressive." Client picks the vibe for **headlines** and for **body**. You map picks → real font pairings later. Output: `type.display_feel`, `type.body_feel`, optional named fonts.

### 5.4 Style & mood preference test
The highest-signal visual step. Show **pairs of full design samples** (sites/brand boards) → "Which feels more like you?" → 6–10 rounds → converge on a style cluster (e.g. minimal-luxury, playful-bold, techy-futuristic, organic-warm). After, ask for **3 words** describing the winner (stored as adjectives). Optionally let them upload their own references here.

### 5.5 Layout & website feel (for web projects)
Quick visual picks: hero style (fullscreen image / split / typographic / video), density (airy ↔ packed), corners (sharp ↔ rounded), motion (still ↔ lively). Feeds the website generator directly.

> **Plain-language rule for every component:** label in human words, hide the jargon, store the technical mapping invisibly. The client experiences a fun "this or that"; you receive precise tokens.

---

## 6. Reference & asset intake

A dedicated, always-present module:
- **Upload** logos, brand files, product photos, packaging, screenshots (drag-drop on desktop, camera/upload on mobile).
- **Paste URLs** — their current site, competitors, "sites I love." The system **auto-extracts** colors, fonts, and a screenshot from each URL (2026 tools like brand-kit extractors do exactly this) and shows them back for confirmation.
- **Pinterest / moodboard link** ingestion.
- Everything is stored against the project and **tagged** (love / like / avoid).
Output: `references[]` with type, source, extracted palette/fonts, and sentiment.

---

## 7. The live multi-device session (co-presence)

Your "share a link, he picks on his phone while I drive" requirement.

### Behaviour
- **Host view (you):** full control — move forward/back, skip, regenerate a question, override, see live structured data filling in.
- **Client view (their device):** sees the **current question only**, taps choices, uploads references, sees a friendly progress bar. Clean, branded, no internal notes.
- **Realtime sync:** host advances → client's screen updates instantly; client taps → host sees it land. Presence indicators ("client is viewing," "client is choosing"). 
- **Permission levels / modes** (mirrors co-browsing tech): **Presenter mode** (host leads, client only answers the active step), **Explore mode** (client can browse the visual library freely), **Review mode** (read-only recap). Sensitive internal fields (budget notes, your scoring) are **never** sent to the client view.
- **Async fallback:** if there's no live call, send the same link as a **self-serve** questionnaire the client fills alone; you review after.

### Tech (for Claude Code)
- **Realtime layer:** Supabase Realtime (presence + broadcast + DB changes over WebSockets, generous free tier) is the simplest fit; **Liveblocks** if you want richer multiplayer/cursors; **Yjs/CRDT** only if you later need true concurrent editing. Start with Supabase Realtime.
- **Session model:** a `session` row with a join code/short link; host and client are participants with `role`; every answer write broadcasts to the room.
- **Security:** room tokens, expiry, field-level visibility (client vs internal), TLS; mask anything sensitive — same discipline co-browsing tools use.

---

## 8. The structured output — the bridge to everything

When the session ends, generate **four artifacts automatically**, then a human gate:

1. **Brand Data Object (JSON)** — the typed source of truth (schema in §9).
2. **DTCG design tokens** (`brand.tokens.json`) — colors (with neutrals + semantics derived), type scale, spacing, radius, shadow — standard format, ready for Figma/code/AI.
3. **Strategy brief (markdown)** — your existing 9-section brief, kept.
4. **Design-System Seed** — a pre-filled VOLT-style prompt with the real fields populated (colors, fonts, archetype, surfaces, components, references attached). This is what makes "discovery → fully advanced design system" one click instead of manual translation.

---

## 9. Data model (hand this to Claude Code)

```ts
type BrandDataObject = {
  project: { id; client; contact; clientEmail; industry; createdAt };

  business: {
    type: "product" | "service" | "hybrid";
    description: string;
    offerings: { name: string; priority: "core"|"secondary" }[];
    stage; model;
  };

  audience: { segments: Segment[]; b2x: "B2B"|"B2C"|"both"; jobsToBeDone: string[] };
  goals: { primary: string; metrics: string[]; blocker: string };
  market: { competitors: { name; url?; sentiment: "admire"|"avoid" }[]; positioning: { axis; value }[] };

  brand: {
    personality: { trait: string; score: number }[];   // adjective sliders
    archetype: string;                                  // e.g. "Creator"
    keywords: string[];                                 // descriptive words captured
  };
  voice: { formality: number; person: "we"|"you"|"mixed"; emoji: boolean; examples: string[] };

  logo: { preferredTypes: LogoType[]; avoid: LogoType[]; notes: string };

  color: {
    locked: { hex; name }[];                            // must-keep
    direction: string;                                  // emotional direction
    chosenPalette: { hex; role: "primary"|"secondary"|"accent"|"neutral" }[];
    productColors?: { hex; name }[];                    // packaging vs brand
    lightDark: "light"|"dark"|"both";
  };
  type: { displayFeel: string; bodyFeel: string; fonts?: { display; body; mono } };

  visualStyle: { cluster: string; moodWords: string[] };
  imagery: { mode: ("photo"|"illustration"|"3d")[]; iconStyle; mood: string };

  surfaces: { kind: string; screens: string[]; components: string[] }[];
  product?: { skus; formats; materials; packagingNeeds: string[] };

  references: { type; source; extracted?: { palette: string[]; fonts: string[] }; sentiment }[];
  constraints: { accessibility; localization; stack; cms; compliance };

  meta: { completeness: number; requiredMissing: string[]; readinessScore?: number };
};
```

Plus a `DesignTokens` export conforming to DTCG 2025.10 (`*.tokens.json`).

---

## 10. End-to-end automation pipeline (the solopreneur dream)

This is the "automate everything a human doesn't need to touch" part. **Centaur model** — agents do the work, you approve at the gates (🚦).

| Stage | Input | Automated by | Human gate |
|---|---|---|---|
| **1. Discovery** | live session | this engine | — |
| **2. Brief & proposal** | Brand Data Object | LLM (Gemini/Claude) → brief + phased scope + price | 🚦 review/send |
| **3. Design tokens** | color/type picks | derive neutrals, semantics, scale → DTCG json | auto |
| **4. Design system** | Design-System Seed | VOLT generator → tokens, components, UI kit | 🚦 review |
| **5. Logo concepts** | logo + color + style | AI logo/SVG gen (e.g. vector-capable models) seeded with tokens | 🚦 pick direction |
| **6. Brand guidelines** | all of the above | assemble the 6 standard sections (logo, color, type, voice, imagery, + usage) into a branded PDF/site | 🚦 review |
| **7. Website** | tokens + surfaces + content | Next.js generator (your portfolio architecture pattern) | 🚦 review/deploy (Vercel) |
| **8. Social kit** | tokens + voice | templated post/story/banner set + caption drafts | 🚦 review |
| **9. Packaging** | product colors + dielines | template/mockup generation | 🚦 review |
| **10. Handoff** | everything | client portal + acknowledgement email (you already have this) | auto |

Each stage **reads the same Brand Data Object**, so nothing is re-entered. Your existing Apps Script email/PDF/Sheets layer becomes stage 10's delivery rail.

> **Guardrail:** resist full autopilot on taste-critical, client-facing steps (logo direction, final brief). Automate the *production*; keep your judgment on the *direction*. That's what protects quality as a one-person shop.

---

## 11. Recommended tech stack (upgrade path)

Your current app is a single `index.html` — brilliant for v1, but the live/visual/asset features need real infrastructure:

| Concern | Recommendation |
|---|---|
| App | **Next.js** (App Router) + TypeScript — replaces the single HTML file; keep it deployable on Vercel |
| Backend / DB / realtime / storage / auth | **Supabase** (Postgres + Realtime + Storage for uploads + Auth for host/client roles) |
| AI | **Gemini** (you have it) for questions/briefs; consider **Claude** for synthesis; vector-capable image model for logos |
| URL/brand extraction | a brand-kit/extractor API or your own scrape+screenshot service |
| Tokens | **Style Dictionary / Tokens Studio** to transform DTCG json → CSS/Figma |
| Exports | keep your Apps Script rail; add design-system seed + tokens export |
| Realtime infra | **Supabase Realtime** first; **Liveblocks** if you want premium multiplayer feel |

You can keep "Standard mode / no-backend" as a lite fallback, but the flagship experience is the Next.js + Supabase app.

---

## 12. Phased build roadmap (for Claude Code)

1. **Restructure** — port the app to Next.js + Supabase; introduce the **Brand Data Object** schema; make every existing answer write structured fields, not just text. (Biggest leverage; do first.)
2. **Visual elicitation library** — build the components in §5 (logo-type picker, color steps, type specimens, style preference test). Start with the logo-type and color pickers.
3. **Reference intake** — uploads + URL extraction module.
4. **Completeness engine** — required-field gating + readiness score; keep Gemini adaptive questioning on top.
5. **Live multi-device sessions** — Supabase Realtime, host/client roles, permission modes, join link.
6. **Structured outputs** — Brand Data Object + DTCG tokens + Design-System Seed export.
7. **Downstream generators** — wire the seed into VOLT (design system) first, then logo, then brand-guidelines PDF, then website.
8. **Automation + gates** — connect the pipeline stages with approval checkpoints; reuse the Apps Script delivery.

Ship 1–2 as the new core; everything else layers on without rework because they all read one schema.

---

## 13. What this gets you

A client sits with you (or alone on their phone), taps through a fun, visual "this or that" experience that never once asks them to understand design language — and at the end you have a **typed, standards-compliant brand dataset** that auto-produces a design system, logo directions, brand guidelines, a website, and a social kit, each waiting for your one-tap approval. That's the difference between a clever questionnaire and the operating system of a one-person agency.

---

## Sources

- [Design Tokens specification reaches first stable version (2025.10) — W3C DTCG](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/) · [Format Module 2025.10](https://www.designtokens.org/tr/2025.10/format/)
- [7 Types of Logos — VistaPrint](https://www.vistaprint.com/hub/types-of-logos) · [9 Types of Logos in 2026 — Ebaqdesign](https://www.ebaqdesign.com/blog/types-of-logos) · [7 Types of Logos in 2026 — Inkbot](https://inkbotdesign.com/different-types-of-logos/)
- [Testing Visual Design — Nielsen Norman Group](https://www.nngroup.com/articles/testing-visual-design/) · [Preference Testing — User Interviews](https://www.userinterviews.com/ux-research-field-guide-chapter/preference-testing) · [Graphic Design Questionnaire — Content Snare](https://contentsnare.com/graphic-design-questionnaire/)
- [Brand Discovery & Strategy — Beyond Branding](https://medium.com/beyond-branding/brand-building-discovery-strategy-d467b50e8eb1) · [Branding Questionnaire — ManyRequests](https://manyrequests.com/blog/branding-questionnaire-for-clients) · [Brand Discovery Questionnaire — Slam Media Lab](https://www.slammedialab.com/resources/brand-discovery-questionnaire)
- [Brand Guidelines components — IxDF (2026)](https://ixdf.org/literature/topics/brand-guidelines) · [6 Elements of Brand Guidelines — Studio Noel](https://studionoel.co.uk/elements-of-brand-guidelines) · [Brand Identity System — Spellbrand](https://spellbrand.com/blog/brand-identity-system)
- [10 AI Design & Branding Tools 2026 — Taskade](https://www.taskade.com/blog/ai-design-branding-tools) · [AI Brand Kit Generator — Ad Legends](https://www.adlegends.ai/ai-brand-kit-generator) · [Best AI Logo Generators 2026 — Designlab](https://designlab.com/blog/top-best-ai-logo-generators-a-review)
- [How to Build an Agentic Marketing Agency 2026 — Refresh Agent](https://refreshagent.com/resources/how-to-use-ai-agents-marketing-agency) · [Reinventing marketing workflows with agentic AI — McKinsey](https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights/reinventing-marketing-workflows-with-agentic-ai)
- [Supabase Realtime: Presence](https://supabase.com/features/realtime-presence) · [Liveblocks Multiplayer](https://liveblocks.io/multiplayer) · [Liveblocks Yjs](https://liveblocks.io/blog/introducing-liveblocks-yjs) · [Co-browsing technology guide — Grypp](https://grypp.io/what-is-co-browsing/)
