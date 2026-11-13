# Pebble

A calm, personal reflection app. Voice-note transcriptions arrive from a Pebble
Index 01 ring via webhook; each note is sorted into a **task**, a **thought**, or
an **idea** (and **work** or **life**), and nightly / weekly / monthly jobs write
gentle reflections. Single user, no login for v1.

Built to the spec in [`pebble-index-app-build-guide-online.md`](./pebble-index-app-build-guide-online.md).

## Stack

- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase** (Postgres) via `@supabase/supabase-js`, server-side, service_role key
- **OpenAI** (`openai`), model `gpt-4o-mini`, JSON mode
- Hosted on **Vercel**; scheduled jobs via **Vercel Cron**

## Going live (all in the browser)

1. **Run the schema.** In Supabase → SQL Editor, paste all of
   [`schema.sql`](./schema.sql) and **Run**. It creates every table (no seed
   data — the app starts empty and fills as you capture notes).
   *Already ran an earlier version?* Run [`migration.sql`](./migration.sql)
   instead. Every statement in it is guarded, so it's safe to run again; for
   **Threads**, the section at the end of that file is all you need.
2. **Set the five environment variables** in Vercel → Project → Settings →
   Environment Variables (see [`.env.example`](./.env.example)):
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CAPTURE_SECRET` — a long random string you invent
   - `CRON_SECRET` — another long random string
   - `APP_PASSWORD` *(optional)* — set this to lock the app behind a password
     (unlocks for 2 weeks per device); leave it unset and the app stays open
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` *(optional)* — for
     push notifications (`npx web-push generate-vapid-keys`); leave unset to
     disable notifications
   - `CALENDAR_TOKEN` *(optional)* — a long random string you invent; turns on
     the calendar subscription feed. Leave unset to keep it off.
   - `SEARCH_EMBEDDINGS` *(optional)* — set to `1` for meaning-based (semantic)
     search. Keyword search works without it. Requires the vector columns in
     `schema.sql` / `migration.sql`.
   Then **Redeploy**.
3. **Point the ring at the webhook.** In the Pebble app → Index settings →
   Webhook, set the URL to
   `https://<your-app>.vercel.app/api/capture?secret=YOUR_CAPTURE_SECRET`
   and have it send the transcription on each recording.

Until the env vars are set, the screens render in-app sample content so the
design is always visible; once Supabase is connected they show your real data.

## How it runs

- `POST /api/capture?secret=…` — saves each transcription and **answers the
  Pebble app immediately**, then sorts the note in the background (task / thought
  / idea, work / life). The ring's webhook never waits on the AI, so it doesn't
  time out or resend. If the sort fails, the note is still saved; Today offers
  “sort now” after a minute and a half, and the nightly sweep catches the rest.
- **Notes appear live.** While the app is open, it asks `GET /api/pulse` whether
  anything new has landed (right away when you return to the app, every few
  seconds while a note is mid-sort, every 8s otherwise, never when hidden) and
  refreshes only when something changed. A new note shows on Today under
  **Just arrived** in your own words the moment it lands, then moves to its home
  once sorted. Notes the sorter wasn't sure about wait there too, ready to file.
- **Threads.** The nightly job looks over the last 30 days for a subject you
  keep coming back to: a named thing (like an app you're building) after 3
  notes, or any other topic after 5 notes spread over 3 different days. It then
  asks on Today, one question at a time: *Make a thread*, *Not yet* (asks again
  after 3 more notes) or *Not a thing* (never asks again). A thread gathers the
  thoughts, ideas and tasks about it (older ones too, once it's made), and new
  notes join as they're sorted. **Pebble's read** is a candid but kind take:
  the gist, what keeps coming up, tensions, what's shifted, open questions and
  next moves, each citing the notes behind it. It rewrites itself once 3 new
  notes have joined. Swipe a note for *Not about this*; it stays where it lives.
  Needs the Threads section of `migration.sql`.
- **Navigation.** Five tabs (Today, Thoughts, Ideas, Threads, Tasks); the one
  you're on names itself. Past reflections live under the moon in the top bar,
  which shows a small dot when a new weekly or monthly one is waiting.
- **Arrival notifications** *(with push turned on)*. Once a note from the ring
  is sorted, devices that keep **Notes from your ring** switched on (Settings →
  Notifications) get a quiet receipt of where it went: "On your work list",
  "Kept as a thought", "Saved as a spark". Several in a row fold into one
  ("3 notes landed"), they stay quiet while Pebble is open and focused (except
  on iPhone, where web apps must show every push), and opening the app clears
  them. Only live arrivals notify; the nightly sweep and "sort now" never do.
- Every Supabase read is `no-store`. Next 14 otherwise caches them in its Data
  Cache indefinitely, even on `force-dynamic` pages, which made new notes appear
  only when something happened to clear the cache.
- `POST|GET /api/cron/nightly` — sweeps any unsorted captures, then writes the
  **daily reflection**.
- `POST|GET /api/cron/nightly-recap` — a later same-day pass that refreshes the
  daily reflection only if new notes arrived since the evening run.
- `POST|GET /api/cron/weekly` (Sundays) and `/api/cron/monthly` (the 1st) — wider reflections.
- The cron routes require `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron adds this automatically). Schedules live in [`vercel.json`](./vercel.json) — UTC, currently set for US Eastern (reflection ~9pm, recap ~11:30pm).
- A dev **“Process now”** button on Today runs the nightly pipeline on demand
  (via a server action, so `CRON_SECRET` never reaches the browser).
- `GET /api/calendar/tasks.ics?token=…` — a subscribable iCalendar feed of every
  dated to-do (all-day events that update themselves). The **Tasks** screen has a
  “Subscribe in your calendar” link once `CALENDAR_TOKEN` is set.
- `GET /api/export[?format=md]` — downloads a complete backup (JSON) or a readable
  archive (Markdown) of everything. Linked from Today under **Backup**.
- The **Search** screen recalls across thoughts, ideas, and tasks — keyword always,
  and by meaning when `SEARCH_EMBEDDINGS=1`. The nightly job backfills embeddings
  for older notes a batch at a time.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your values
npm run dev
```
