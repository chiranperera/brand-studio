-- Phase 3 — live multi-device sessions.
-- Run in the Supabase SQL editor (after 0001).

-- Tag each answer with who made the selection (host = designer, client = on their
-- phone), so client-driven choices are tracked and visible in Step 4.
alter table answers add column if not exists actor text;   -- 'host' | 'client' | null

-- join_code already exists on sessions (0001). Make sure it can be looked up.
create index if not exists sessions_join_code_idx on sessions(join_code);

-- Realtime: this build uses broadcast + presence channels (ephemeral), which need
-- no table replication. Nothing else to enable.
