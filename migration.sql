-- ============================================================================
-- Migration: add Ideas
-- Run this ONCE in Supabase → SQL Editor if you already created the tables
-- from an earlier version of schema.sql (so you don't re-run the whole file).
-- Safe to run more than once — every statement is guarded.
-- ============================================================================

-- The new category.
create table if not exists ideas (
  id           uuid primary key default gen_random_uuid(),
  text         text not null,
  themes       text[] not null default '{}',
  domain       text,
  captured_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists ideas_captured_idx on ideas (captured_at desc);

-- Let a noodle hang off an idea as well as a thought.
alter table noodles add column if not exists idea_id uuid references ideas(id) on delete cascade;
alter table noodles alter column thought_id drop not null;
