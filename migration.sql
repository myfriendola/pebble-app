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
