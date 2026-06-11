# Discovery Studio — Phase 1

An adaptive brand & design **discovery engine**. Create a project, run a session
where every answer maps to a **typed field** (the Brand Data Object), then export
a valid **Design Pack** (README + brief + `brand-data.json` + DTCG tokens +
references + deliverables) that drops straight into Claude Design.

Built to the Phase 1 build spec; produces the Design Pack output contract. See
[`markdown/`](./markdown) for the source specs and blueprint.

## Stack
- **Next.js 15** (App Router) · React 19 · TypeScript · Tailwind
- **Supabase** — Postgres + Auth + Storage (RLS on from day one)
- **Gemini** (`gemini-2.5-flash`) — server-side, key never reaches the browser
- **jszip** (pack assembly) · **zod** (validation)

## Architecture
```
app/
  (auth)/login            host email/password sign-in
  (app)/dashboard         create / list projects
  (app)/projects/[id]     overview + completeness + reference upload
            /session      the adaptive discovery flow
            /export       generate + download the Design Pack
  api/question            POST → next adaptive question (server Gemini)
  api/brief               POST → brief.md + deliverables
  api/export              POST → assemble + zip + signed download URL
lib/
  brand-data.ts           BrandDataObject type, factory, zod, computeCompleteness
  mapping.ts              answer → typed field writer + FIELD_PATHS
  tokens.ts               derive DTCG token ramp from the picks
  question-engine.ts      server prompt + schema (adds `field`, completeness-gated)
  question-bank.ts        standard fallback bank (hard-coded fields)
  gemini.ts               server Gemini caller (model fallback)
  export/design-pack.ts   folder tree + zip + deterministic fallbacks
  export/generate.ts      brief/deliverables (Gemini → fallback)
  supabase/{client,server}.ts
supabase/migrations/0001_init.sql   schema + RLS + storage buckets
integrations/google-apps-script.gs  optional Sheets/email delivery rail (ported)
```

## The data flow (the key idea)
Every question declares a `field` (a dot-path into the Brand Data Object). On
submit, the answer is logged to `answers` **and** merged into
`projects.brand_data` via `writeField`. `computeCompleteness` gates the session
and the export. By the end, `brand_data` is a fully-typed object the export reads.

## Setup
1. `npm install`
2. Create a Supabase project. In the SQL editor, run **[`supabase/setup.sql`](./supabase/setup.sql)**
   — one idempotent script that creates all tables, RLS, storage buckets, and the
   later columns (`answers.actor`, `answers.options`). Safe to re-run.
   (Individual migrations live in `supabase/migrations/` if you prefer.)
3. Copy `.env.local.example` → `.env.local` and fill:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project → API)
   - `SUPABASE_SERVICE_ROLE_KEY` (server only)
   - `GEMINI_API_KEY` (https://aistudio.google.com/apikey)
4. `npm run dev` → open http://localhost:3000, sign up, create a project.

> Email confirmation: for a smooth solo flow, disable "Confirm email" in
> Supabase → Authentication → Providers → Email (or confirm via the inbox).

## Deploy
GitHub → Vercel import. Add the same env vars in Vercel. Pushes auto-deploy.

## Optional: Sheets + acknowledgement email
`integrations/google-apps-script.gs` is the ported delivery rail from the old
tool (per-project Google Sheet + branded client acknowledgement email/PDF). It's
standalone and **not wired into Phase 1** — paste it into Apps Script when you
want stage-10 delivery. See its header for setup.

## Status / TODO
- Visual elicitation (logo-type picker, palette this-or-that) → Phase 2.
- Live multi-device sessions (Supabase Realtime) → Phase 3.
- URL/brand extraction for references → later.
