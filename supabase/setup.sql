-- Discovery Studio — complete database setup (idempotent).
-- Run this ONE file in the Supabase SQL editor to set up everything.
-- Safe to re-run.

-- =================== 0001 — core schema ===================
-- Discovery Studio — Phase 1 schema
-- Run in the Supabase SQL editor (or `supabase db push`).

-- ============================== TABLES ==============================

-- Projects: one per client engagement
create table if not exists projects (
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
create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  mode        text not null default 'ai',             -- ai | standard
  join_code   text unique,                            -- reserved for Phase 3 live sessions
  created_at  timestamptz not null default now()
);

-- Answers: one row per answered question, ALWAYS tagged with the field it fills
create table if not exists answers (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  field_path  text,                                   -- e.g. "logo.preferredTypes"
  section     text,
  question    text not null,
  input_type  text not null,                          -- textarea|text|select|multiselect|rating
  answer      jsonb,                                  -- string | string[] | number
  note        text,
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

-- Assets & references: uploaded files + tagged references
create table if not exists assets (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  kind        text not null,                          -- inspiration | competitor | logo | product | guidelines
  source      text,                                   -- 'upload' or a URL
  storage_path text,                                  -- Supabase Storage path
  sentiment   text,                                   -- love | like | avoid
  note        text,
  extracted   jsonb,                                  -- {palette:[], fonts:[]} (later)
  created_at  timestamptz not null default now()
);

-- Exports: record of generated Design Packs
create table if not exists exports (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  storage_path text,                                  -- zip in Storage
  created_at  timestamptz not null default now()
);

create index if not exists projects_owner_idx on projects(owner_id);
create index if not exists answers_project_idx on answers(project_id);
create index if not exists assets_project_idx  on assets(project_id);
create index if not exists sessions_project_idx on sessions(project_id);

-- updated_at trigger
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists projects_touch on projects;
create trigger projects_touch before update on projects
  for each row execute function touch_updated_at();

-- ============================== RLS ==============================

alter table projects enable row level security;
alter table sessions enable row level security;
alter table answers  enable row level security;
alter table assets   enable row level security;
alter table exports  enable row level security;

drop policy if exists "owner rw" on projects;
create policy "owner rw" on projects
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "by project" on sessions;
create policy "by project" on sessions for all
  using (exists (select 1 from projects p where p.id = sessions.project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = sessions.project_id and p.owner_id = auth.uid()));

drop policy if exists "by project" on answers;
create policy "by project" on answers for all
  using (exists (select 1 from projects p where p.id = answers.project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = answers.project_id and p.owner_id = auth.uid()));

drop policy if exists "by project" on assets;
create policy "by project" on assets for all
  using (exists (select 1 from projects p where p.id = assets.project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = assets.project_id and p.owner_id = auth.uid()));

drop policy if exists "by project" on exports;
create policy "by project" on exports for all
  using (exists (select 1 from projects p where p.id = exports.project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = exports.project_id and p.owner_id = auth.uid()));

-- ============================== STORAGE ==============================
-- Private buckets; access via signed URLs.
insert into storage.buckets (id, name, public)
  values ('references', 'references', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('exports', 'exports', false)
  on conflict (id) do nothing;

-- Storage RLS: a user may touch objects whose first path segment is a project
-- they own. Upload convention: `<project_id>/<filename>`.
drop policy if exists "references owner" on storage.objects;
create policy "references owner" on storage.objects for all
  using (
    bucket_id = 'references'
    and exists (
      select 1 from projects p
      where p.id::text = (storage.foldername(name))[1] and p.owner_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'references'
    and exists (
      select 1 from projects p
      where p.id::text = (storage.foldername(name))[1] and p.owner_id = auth.uid()
    )
  );

drop policy if exists "exports owner" on storage.objects;
create policy "exports owner" on storage.objects for all
  using (
    bucket_id = 'exports'
    and exists (
      select 1 from projects p
      where p.id::text = (storage.foldername(name))[1] and p.owner_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'exports'
    and exists (
      select 1 from projects p
      where p.id::text = (storage.foldername(name))[1] and p.owner_id = auth.uid()
    )
  );

-- =================== 0002 — live sessions ===================
-- Phase 3 — live multi-device sessions.
-- Run in the Supabase SQL editor (after 0001).

-- Tag each answer with who made the selection (host = designer, client = on their
-- phone), so client-driven choices are tracked and visible in Step 4.
alter table answers add column if not exists actor text;   -- 'host' | 'client' | null

-- join_code already exists on sessions (0001). Make sure it can be looked up.
create index if not exists sessions_join_code_idx on sessions(join_code);

-- Realtime: this build uses broadcast + presence channels (ephemeral), which need
-- no table replication. Nothing else to enable.

-- =================== 0003 — answer options ===================
-- Phase 1 follow-up — persist each question's option list so all options
-- (not just the selected one) survive a reload / resume.
-- Run in the Supabase SQL editor (after 0001 and 0002).

alter table answers add column if not exists options jsonb;
