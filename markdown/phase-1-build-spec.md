# Discovery Studio — Phase 1 Build Spec (for Claude Code)

> **Goal of Phase 1.** Stand up the foundation: a deployable Next.js + Supabase app where you create a project, run an adaptive discovery session that writes **structured fields** (the Brand Data Object — not free text), and export a valid **Design Pack** (per the Design Pack spec). This is the skeleton everything else hangs on.
>
> **Hand-off.** This document is written to be handed to Claude Code. It contains the repo structure, the full database schema (SQL), the typed Brand Data Object, the answer→field mechanism, the export, a build checklist, and acceptance criteria.

---

## 1. Scope

**In scope (Phase 1)**
- Next.js app (App Router, TypeScript, Tailwind) deployable on Vercel.
- Supabase: Postgres + Auth (host login) + Storage (uploads).
- Projects dashboard: create / list / open a project.
- **Structured discovery flow** (single device): port the existing adaptive-Gemini engine, but every answer maps to a **typed field** in the Brand Data Object.
- Standard fallback question bank (no-key mode), kept.
- Reference/asset upload (basic).
- **Design Pack export** — assemble the folder + zip from structured data.

**Out of scope (later phases)**
- Visual elicitation library (logo-type picker, color this-or-that) → Phase 2.
- Live multi-device sessions (Supabase Realtime) → Phase 3.
- Downstream generators (design system, logo, website) → Phase 4+.

Keep Phase 1 lean: a host can run a session solo and walk away with a Design Pack.

---

## 2. Stack & environment

- **Next.js 15** (App Router) · **React 19** · **TypeScript** · **Tailwind CSS**.
- **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`).
- **AI:** Gemini (`@google/generative-ai`) — model `gemini-2.5-flash`. (Claude optional later.)
- **Zip:** `jszip`. **Validation:** `zod`.

**Env vars** (`.env.local`, and in Vercel + Supabase dashboards):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only, never client
GEMINI_API_KEY=                   # server-side; or per-user key in settings
```
> Move Gemini calls **server-side** (a route handler) so the key isn't in the browser — an upgrade over the current client-side approach.

---

## 3. Repo structure

```
discovery-studio/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                 # app shell, auth guard
│   │   ├── dashboard/page.tsx         # list + create projects
│   │   └── projects/[id]/
│   │       ├── page.tsx               # project overview + completeness
│   │       ├── session/page.tsx       # the discovery flow
│   │       └── export/page.tsx        # generate + download Design Pack
│   ├── api/
│   │   ├── question/route.ts          # POST → next adaptive question (server-side Gemini)
│   │   ├── brief/route.ts             # POST → generate brief.md / deliverables
│   │   └── export/route.ts            # POST → assemble + zip Design Pack
│   └── layout.tsx
├── lib/
│   ├── supabase/{client.ts,server.ts} # browser + server clients (@supabase/ssr)
│   ├── brand-data.ts                  # BrandDataObject types + empty factory + zod schema
│   ├── mapping.ts                     # answer → BrandDataObject field writer
│   ├── tokens.ts                      # derive DTCG tokens from picks
│   ├── question-engine.ts             # buildPrompt + schema (server)
│   ├── question-bank.ts               # standard fallback bank
│   └── export/design-pack.ts          # build the folder tree + zip
├── components/
│   ├── session/{QuestionCard,InputArea,ProgressRail}.tsx
│   ├── projects/{ProjectList,NewProjectDialog}.tsx
│   └── ui/*                            # buttons, fields, etc.
├── supabase/
│   ├── migrations/0001_init.sql        # schema below
│   └── seed.sql
├── types/
├── .env.local.example
├── tailwind.config.ts
├── next.config.ts
└── README.md
```

---

## 4. Database schema (Supabase / Postgres)

`supabase/migrations/0001_init.sql`:

```sql
-- Projects: one per client engagement
create table projects (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  client_name   text not null,
  contact_name  text,
  client_email  text,
  industry      text,
  status        text not null default 'discovery',   -- discovery | ready | exported
  brand_data    jsonb not null default '{}'::jsonb,    -- the Brand Data Object (source of truth)
  completeness  int  not null default 0,               -- 0-100
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Sessions: a run of the interview for a project (Phase 1: usually one)
create table sessions (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  mode        text not null default 'ai',             -- ai | standard
  join_code   text unique,                            -- reserved for Phase 3 live sessions
  created_at  timestamptz not null default now()
);

-- Answers: one row per answered question, ALWAYS tagged with the field it fills
create table answers (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  field_path  text,                                   -- e.g. "logo.preferredTypes"  (maps into brand_data)
  section     text,                                   -- canonical topic area
  question    text not null,
  input_type  text not null,                          -- textarea|text|select|multiselect|rating
  answer      jsonb,                                  -- string | string[] | number
  note        text,
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

-- Assets & references: uploaded files + tagged references
create table assets (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  kind        text not null,                          -- inspiration | competitor | logo | product | guidelines
  source      text,                                   -- 'upload' or a URL
  storage_path text,                                  -- Supabase Storage path
  sentiment   text,                                   -- love | like | avoid
  note        text,
  extracted   jsonb,                                  -- {palette:[], fonts:[]} from URL extraction (later)
  created_at  timestamptz not null default now()
);

-- Exports: record of generated Design Packs
create table exports (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  storage_path text,                                  -- zip in Storage
  created_at  timestamptz not null default now()
);

create index on projects(owner_id);
create index on answers(project_id);
create index on assets(project_id);

-- updated_at trigger
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger projects_touch before update on projects
  for each row execute function touch_updated_at();
```

**Row-Level Security (enable on every table):**
```sql
alter table projects enable row level security;
create policy "owner rw" on projects
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- sessions/answers/assets/exports: allow when their project belongs to auth.uid()
create policy "by project" on answers for all
  using (exists (select 1 from projects p where p.id = answers.project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = answers.project_id and p.owner_id = auth.uid()));
-- (repeat the pattern for sessions, assets, exports)
```

**Storage buckets:** `references` (private), `exports` (private). Access via signed URLs.

> **Two-layer storage by design:** every answer lives as a row in `answers` (audit trail + re-mapping), *and* the merged result lives in `projects.brand_data` (the fast source of truth the export reads). The mapping layer (§6) keeps them in sync.

---

## 5. The Brand Data Object (`lib/brand-data.ts`)

The canonical typed shape (full version in the blueprint §9). Provide:
- `type BrandDataObject = {...}` — the typed object.
- `emptyBrandData(): BrandDataObject` — factory with sensible empties.
- `brandDataSchema` (zod) — validate before export.
- `computeCompleteness(bd): { score:number; missing:string[] }` — required-field check that powers the rail and the export gate.

Required fields for a valid pack (minimum): `business.type`, `business.description`, at least one `business.offerings`, `audience.segments`, `goals.primary`, `brand.archetype` or `brand.personality`, `color.direction` or `color.locked`, `type.displayFeel`, at least one `surfaces`, and ≥1 reference. `computeCompleteness` returns what's still missing.

---

## 6. Answer → field mapping (the key architectural change)

The current tool stores answers as loose `{section, question, answer}`. Phase 1's upgrade: **every question declares which Brand Data field it fills.**

1. Extend the **question schema** the AI returns with a `field` property — a dot-path into the Brand Data Object (e.g. `"logo.preferredTypes"`, `"color.direction"`, `"business.type"`). Add to the prompt: *"Also return `field`: the dot-path of the BrandDataObject this answer fills, chosen from this list: [...enumerate paths...]."*
2. On answer submit:
   - insert a row into `answers` (with `field_path`),
   - call `writeField(brandData, field_path, value)` in `lib/mapping.ts`,
   - persist merged `brand_data` + recomputed `completeness` to `projects`.
3. For the **standard bank**, hard-code each question's `field` up front.

`lib/mapping.ts` handles type coercion per field (string, string[], number, object) and array-append vs replace semantics.

> Result: by the end of a session, `projects.brand_data` is a fully populated, typed object — the export step just reads it.

---

## 7. Adaptive question engine (`lib/question-engine.ts`, server-side)

Port `buildPrompt` from the existing app with three changes:
1. Runs **server-side** in `app/api/question/route.ts` (key stays secret).
2. Schema adds `field` (see §6).
3. Completion gate uses **`computeCompleteness`**, not a question count — the AI is told which required fields are still empty and instructed to target them; the session can only finish when `missing` is empty (or host force-finishes).

Keep: industry personalization, clickable-answer preference (multiselect default), concrete options, dedup.

---

## 8. Design Pack export (`lib/export/design-pack.ts` + `app/api/export/route.ts`)

Given a `projectId`:
1. Load `brand_data`, `answers`, `assets`.
2. `deriveTokens(brand_data)` (`lib/tokens.ts`) → `brand.tokens.json` (DTCG 2025.10): expand locked colors + direction into brand/neutral/semantic ramps; map type feel → font stacks + scale; default spacing/radius/shadow.
3. Generate `brief.md` and each `deliverables/*.md` via `app/api/brief/route.ts` (Gemini) from `brand_data`.
4. Pull reference/asset files from Storage; write `references/references.json`.
5. Assemble the **exact folder tree from the Design Pack spec**, zip with `jszip`, upload to the `exports` bucket, insert an `exports` row, return a signed download URL.

Validate `brandDataSchema` first; block export if `computeCompleteness().missing` is non-empty (warn + allow override).

---

## 9. Build checklist (ordered for Claude Code)

1. Scaffold Next.js + TS + Tailwind; add Supabase clients (`@supabase/ssr`); `.env.local.example`.
2. Run `0001_init.sql` migration; enable RLS + policies; create Storage buckets.
3. Auth: email/password (or magic link) login; protect `(app)` routes.
4. `lib/brand-data.ts` — types, factory, zod, `computeCompleteness`.
5. Dashboard: create/list/open projects (writes `projects`).
6. `lib/mapping.ts` + `app/api/question/route.ts` + question engine (server Gemini, `field` in schema).
7. Session UI: `QuestionCard`, `InputArea` (all input types), `ProgressRail` (completeness); autosave; resume.
8. Standard bank fallback with hard-coded `field`s.
9. Reference/asset upload → Storage + `assets` rows + sentiment tagging.
10. `lib/tokens.ts` (derive DTCG) + `lib/export/design-pack.ts` + `app/api/export/route.ts`.
11. Export page: generate, show contents, download zip.
12. Deploy: GitHub repo → Vercel (env vars) → connect Supabase. Verify preview deploys.

---

## 10. Acceptance criteria (Phase 1 is "done" when…)

- I can log in, create a project, and run a full adaptive session.
- Every answer is stored **and** merged into `projects.brand_data` as typed fields.
- The completeness rail reflects real required-field coverage; the session won't "complete" with required fields missing.
- I can upload a few references and tag them love/avoid.
- I click Export and download a **valid Design Pack zip** matching the Design Pack spec (README, brief.md, brand-data.json, tokens/brand.tokens.json, references/ + manifest, deliverables/).
- Dropping that pack into Claude Design gives it everything it needs to start designing.
- The app is live on Vercel; pushes auto-deploy.

---

## 11. Notes & guardrails
- **Server-side AI keys** (don't ship Gemini key to the browser).
- **RLS on from day one** — client data is sensitive.
- Keep `answers` as the immutable log; treat `brand_data` as the derived view (re-buildable from answers).
- Long export/brief generation is short enough for serverless now; if it grows, move to a background job (flagged for later).
- Don't build visual elicitation or live sessions yet — Phase 1 is the spine that makes them easy to add.
