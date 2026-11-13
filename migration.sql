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

-- Theme tags clustered into higher-level groups (for the grouped theme filter).
create table if not exists theme_groups (
  theme       text primary key,
  grp         text not null,
  updated_at  timestamptz not null default now()
);

-- Web Push subscriptions (one row per installed device).
create table if not exists push_subscriptions (
  endpoint     text primary key,
  subscription jsonb not null,
  created_at   timestamptz not null default now()
);

-- Per-device notification preferences (which types each device wants).
alter table push_subscriptions
  add column if not exists prefs jsonb not null default '{"reflection":true,"reminders":true,"arrivals":true}'::jsonb;

-- Faster due-date lookups for the morning reminders cron and the calendar feed.
create index if not exists work_tasks_due_idx on work_tasks (due);
create index if not exists life_tasks_due_idx on life_tasks (due);

-- ============================================================================
-- Semantic search (optional)
-- Only needed if you want meaning-based search (also set SEARCH_EMBEDDINGS=1 in
-- Vercel). Plain keyword search works without any of this. Safe to run anyway —
-- the columns just stay empty until embeddings are turned on, and the nightly
-- job backfills older notes once they are.
-- ============================================================================
create extension if not exists vector;

alter table thoughts add column if not exists embedding vector(1536);
alter table ideas    add column if not exists embedding vector(1536);

create index if not exists thoughts_embedding_idx on thoughts using hnsw (embedding vector_cosine_ops);
create index if not exists ideas_embedding_idx    on ideas    using hnsw (embedding vector_cosine_ops);

-- Nearest-neighbour search across thoughts + ideas, newest-meaning first.
create or replace function match_notes(query_embedding vector(1536), match_count int default 20)
returns table (
  kind text,
  id uuid,
  text text,
  themes text[],
  domain text,
  captured_at timestamptz,
  similarity float
)
language sql stable
as $$
  select kind, id, text, themes, domain, captured_at, similarity
  from (
    select 'thought'::text as kind, id, text, themes, null::text as domain, captured_at,
           1 - (embedding <=> query_embedding) as similarity
    from thoughts where embedding is not null
    union all
    select 'idea'::text as kind, id, text, themes, domain, captured_at,
           1 - (embedding <=> query_embedding) as similarity
    from ideas where embedding is not null
  ) q
  order by similarity desc
  limit match_count;
$$;

-- ============================================================================
-- Threads
-- A home for a subject you keep coming back to (a project like "Throughline",
-- or an ongoing topic). Pebble notices one, asks before making it, gathers the
-- notes that belong, and writes a candid read of them. Safe to run more than
-- once — every statement is guarded.
-- ============================================================================

-- One row per thread. `read` holds Pebble's latest read (gist, recurring,
-- tensions, shifts, questions, moves, each citing its notes).
create table if not exists threads (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  read             jsonb,
  read_at          timestamptz,
  read_item_count  int not null default 0,
  created_at       timestamptz not null default now()
);

-- Which notes belong to which thread. A note can sit in several threads and
-- still lives in Thoughts / Ideas / Tasks; a thread only collects. `removed`
-- remembers "not about this" so the note isn't gathered again.
create table if not exists thread_items (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references threads(id) on delete cascade,
  item_kind   text not null check (item_kind in ('thought', 'idea', 'work_task', 'life_task')),
  item_id     uuid not null,
  removed     boolean not null default false,
  added_by    text not null default 'pebble',
  created_at  timestamptz not null default now(),
  unique (thread_id, item_kind, item_id)
);
create index if not exists thread_items_item_idx on thread_items (item_kind, item_id);

-- Subjects Pebble has noticed and asked about. One is shown at a time.
-- status: pending (asking) · accepted (became a thread) · declined ("not a
-- thing", never asked again) · snoozed ("not yet", asked again after more notes).
create table if not exists thread_suggestions (
  id                  uuid primary key default gen_random_uuid(),
  subject_key         text not null unique,
  title               text not null,
  description         text,
  items               jsonb not null default '[]'::jsonb,
  note_count          int not null default 0,
  first_at            timestamptz,
  status              text not null default 'pending'
                        check (status in ('pending', 'accepted', 'declined', 'snoozed')),
  snooze_until_count  int,
  thread_id           uuid references threads(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
