-- ============================================================================
-- Pebble Index App — database schema
-- Run this once in Supabase → SQL Editor (paste the whole file, click Run).
-- Creates every table the app uses. No seed data — the app starts empty and
-- fills as you capture notes.
--
-- Already have an earlier version of these tables? See migration.sql for the
-- incremental changes (the `ideas` table and `noodles.idea_id`).
-- ============================================================================

-- gen_random_uuid() lives in pgcrypto; enabled by default on Supabase, but be safe.
create extension if not exists pgcrypto;

-- Raw voice-note transcriptions as they arrive from the ring's webhook.
create table if not exists captures (
  id           uuid primary key default gen_random_uuid(),
  transcript   text not null,
  captured_at  timestamptz not null default now(),
  processed    boolean not null default false,
  created_at   timestamptz not null default now()
);

-- A capture classified as an open reflection, with 1–3 theme tags.
create table if not exists thoughts (
  id           uuid primary key default gen_random_uuid(),
  text         text not null,
  themes       text[] not null default '{}',
  captured_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- A capture classified as a spark worth exploring or making later. Themes like
-- a thought, plus an optional work/life domain.
create table if not exists ideas (
  id           uuid primary key default gen_random_uuid(),
  text         text not null,
  themes       text[] not null default '{}',
  domain       text,
  captured_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- A capture classified as a professional to-do. Keeps the original spoken words.
create table if not exists work_tasks (
  id           uuid primary key default gen_random_uuid(),
  action       text not null,
  source_quote text,
  due          date,
  priority     text,
  status       text not null default 'open',
  captured_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- Same shape as work_tasks, for personal life to-dos.
create table if not exists life_tasks (
  id           uuid primary key default gen_random_uuid(),
  action       text not null,
  source_quote text,
  due          date,
  priority     text,
  status       text not null default 'open',
  captured_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- The gentle back-and-forth when the user taps a thought or idea to noodle on
-- it. Exactly one of thought_id / idea_id is set per row.
create table if not exists noodles (
  id          uuid primary key default gen_random_uuid(),
  thought_id  uuid references thoughts(id) on delete cascade,
  idea_id     uuid references ideas(id) on delete cascade,
  prompt      text not null,
  reply       text,
  created_at  timestamptz not null default now()
);

-- Saved reflections: daily (nightly), weekly (Sundays), monthly (the 1st).
create table if not exists digests (
  id                 uuid primary key default gen_random_uuid(),
  kind               text not null check (kind in ('daily', 'weekly', 'monthly')),
  period_date        date not null,
  narrative          text not null,
  questions          text[] not null default '{}',
  themes             text[] not null default '{}',
  needs_review_count int not null default 0,
  created_at         timestamptz not null default now()
);

-- Low-confidence classifications (< 0.6) held back for a human glance.
create table if not exists review_queue (
  id          uuid primary key default gen_random_uuid(),
  capture_id  uuid references captures(id) on delete cascade,
  best_guess  jsonb,
  created_at  timestamptz not null default now()
);

-- Theme tags clustered into higher-level groups (rebuilt nightly) so the theme
-- filter stays browsable as the vocabulary grows.
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

-- Helpful indexes for the day / stream / reflection queries.
create index if not exists captures_processed_idx  on captures (processed, captured_at);
create index if not exists thoughts_captured_idx    on thoughts (captured_at desc);
create index if not exists ideas_captured_idx       on ideas (captured_at desc);
create index if not exists work_tasks_captured_idx  on work_tasks (captured_at desc);
create index if not exists life_tasks_captured_idx  on life_tasks (captured_at desc);
create index if not exists digests_kind_date_idx    on digests (kind, period_date desc);
-- Due-date lookups (the morning reminders cron and the calendar feed filter by due).
create index if not exists work_tasks_due_idx        on work_tasks (due);
create index if not exists life_tasks_due_idx        on life_tasks (due);

-- ── Semantic search (optional) ──────────────────────────────────────────────
-- Powers meaning-based search when SEARCH_EMBEDDINGS=1 is set. Harmless to keep
-- even if you never enable it — the columns just stay empty.
create extension if not exists vector;
alter table thoughts add column if not exists embedding vector(1536);
alter table ideas    add column if not exists embedding vector(1536);
create index if not exists thoughts_embedding_idx on thoughts using hnsw (embedding vector_cosine_ops);
create index if not exists ideas_embedding_idx    on ideas    using hnsw (embedding vector_cosine_ops);

create or replace function match_notes(query_embedding vector(1536), match_count int default 20)
returns table (
  kind text, id uuid, text text, themes text[], domain text, captured_at timestamptz, similarity float
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
