-- ============================================================================
-- Pebble Index App — database schema
-- Run this in Supabase → SQL Editor (paste the whole file, click Run).
-- Creates every table the app uses, then seeds a few gentle example rows so
-- your screens aren't empty on first load.
--
-- To start completely empty instead, delete the "SEED DATA" block at the
-- bottom before running (everything above it is just CREATE TABLE).
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

-- The gentle back-and-forth when the user taps a thought to noodle on it.
create table if not exists noodles (
  id          uuid primary key default gen_random_uuid(),
  thought_id  uuid references thoughts(id) on delete cascade,
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

-- Helpful indexes for the day / stream / reflection queries.
create index if not exists captures_processed_idx  on captures (processed, captured_at);
create index if not exists thoughts_captured_idx    on thoughts (captured_at desc);
create index if not exists work_tasks_captured_idx  on work_tasks (captured_at desc);
create index if not exists life_tasks_captured_idx  on life_tasks (captured_at desc);
create index if not exists digests_kind_date_idx    on digests (kind, period_date desc);


-- ============================================================================
-- SEED DATA  (optional — delete from here down to start with empty screens)
-- A calm, believable day so the app looks alive before your first real notes.
-- Dates are relative to "today" so the daily reflection always lands on Today.
-- ============================================================================

-- Thoughts across the last several days (shared themes make the filter sing).
insert into thoughts (text, themes, captured_at) values
  ('I keep coming back to that novel on the nightstand. Reading for its own sake, not to finish it.',
     array['reading again','slowness'], now() - interval '2 hours'),
  ('There''s a low hum of nerves about the launch. Not fear exactly — more like standing at the edge before the water.',
     array['launch nerves','work'], now() - interval '5 hours'),
  ('Mornings feel different when I don''t reach for the phone first. The light gets a minute of my attention.',
     array['mornings','slowness'], now() - interval '8 hours'),
  ('Wondering if I''ve been mistaking being busy for being useful.',
     array['launch nerves','slowness'], now() - interval '1 day 3 hours'),
  ('Picked the book back up on the train. Twenty pages and I forgot to check the time.',
     array['reading again'], now() - interval '2 days 6 hours'),
  ('The team meeting ran long but the quiet ten minutes after was where the real thinking happened.',
     array['work','slowness'], now() - interval '3 days 4 hours'),
  ('A slow morning with coffee and no plan. I should protect more of these.',
     array['mornings'], now() - interval '4 days 7 hours');

-- Work tasks — action up top, the original spoken words kept underneath.
insert into work_tasks (action, source_quote, due, priority, captured_at) values
  ('Send the launch deck to Priya for a final read',
     'Remind me to send the deck to Priya before she logs off — she wanted a last look.',
     (now() + interval '1 day')::date, 'high', now() - interval '4 hours'),
  ('Draft the changelog for the release notes',
     'I should write up the changelog at some point this week, nothing fancy.',
     null, 'normal', now() - interval '6 hours');

-- Life tasks.
insert into life_tasks (action, source_quote, due, priority, captured_at) values
  ('Call Mum back this weekend',
     'Oh — call Mum back, she left a voicemail and I keep forgetting.',
     (now() + interval '2 days')::date, 'normal', now() - interval '7 hours'),
  ('Renew the library card',
     'The library card expired, sort that out so I can keep borrowing.',
     null, null, now() - interval '1 day 2 hours');

-- Two captures held back for review (low confidence), plus their queue rows.
with c as (
  insert into captures (transcript, processed, captured_at) values
    ('Blue folder. Thursday. The thing with the numbers.', true, now() - interval '3 hours'),
    ('Maybe the roses, maybe not. We''ll see how it feels.', true, now() - interval '9 hours')
  returning id, transcript
)
insert into review_queue (capture_id, best_guess)
select id,
  jsonb_build_object('type','task','domain','work','confidence',0.42,'note',transcript)
from c;

-- One noodle already begun on the most recent thought.
insert into noodles (thought_id, prompt, reply)
select id,
  'What would it feel like to read only for the pleasure of it, with nowhere to arrive?',
  null
from thoughts
where themes @> array['reading again']
order by captured_at desc
limit 1;

-- Today's reflection (makes the Today screen bloom into its evening state).
insert into digests (kind, period_date, narrative, questions, themes, needs_review_count) values
  ('daily', current_date,
   'Today circled back to slowness more than once — the novel on the nightstand, the unhurried mornings, the quiet after the meeting. Underneath the launch nerves there was a gentler question about whether busy has been standing in for useful.',
   array['Where did today feel most like your own?','What would you protect if the launch were already behind you?'],
   array['slowness','launch nerves','reading again'],
   2);

-- A past weekly and monthly reflection so the Reflections screen has depth.
insert into digests (kind, period_date, narrative, questions, themes, needs_review_count) values
  ('weekly', current_date - interval '2 days',
   'The week kept returning to reading and to mornings — small reclaimed pockets of attention. Work pressed in around the edges, but the notes that stayed with you were the slow ones. The launch is close, and you seem to be meeting it more steadily than a week ago.',
   array['Which small ritual do you want to carry into next week?'],
   array['reading again','mornings','launch nerves'], 0),
  ('monthly', date_trunc('month', current_date)::date,
   'A month of learning to move a little slower on purpose. Reading came back. The phone lost a few of its mornings. The work anxieties didn''t vanish, but they shared the room with something calmer. A theme took shape: usefulness measured less by motion.',
   array['What did slowing down make room for this month?'],
   array['slowness','reading again','mornings'], 0);
