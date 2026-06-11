-- Phase 1 follow-up — persist each question's option list so all options
-- (not just the selected one) survive a reload / resume.
-- Run in the Supabase SQL editor (after 0001 and 0002).

alter table answers add column if not exists options jsonb;
