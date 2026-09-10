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
   instead — it adds just the new `ideas` table and `noodles.idea_id`.
2. **Set the five environment variables** in Vercel → Project → Settings →
   Environment Variables (see [`.env.example`](./.env.example)):
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CAPTURE_SECRET` — a long random string you invent
   - `CRON_SECRET` — another long random string
   Then **Redeploy**.
3. **Point the ring at the webhook.** In the Pebble app → Index settings →
   Webhook, set the URL to
   `https://<your-app>.vercel.app/api/capture?secret=YOUR_CAPTURE_SECRET`
   and have it send the transcription on each recording.

Until the env vars are set, the screens render in-app sample content so the
design is always visible; once Supabase is connected they show your real data.

## How it runs

- `POST /api/capture?secret=…` — stores each transcription **and sorts it on the
  spot** (task / thought / idea, work / life), so it appears on the right screen
  within seconds. Sorting is best-effort; if it fails the note is still saved and
  the nightly sweep sorts it later.
- `POST|GET /api/cron/nightly` — sweeps any unsorted captures, then writes the
  **daily reflection**.
- `POST|GET /api/cron/nightly-recap` — a later same-day pass that refreshes the
  daily reflection only if new notes arrived since the evening run.
- `POST|GET /api/cron/weekly` (Sundays) and `/api/cron/monthly` (the 1st) — wider reflections.
- The cron routes require `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron adds this automatically). Schedules live in [`vercel.json`](./vercel.json) — UTC, currently set for US Eastern (reflection ~9pm, recap ~11:30pm).
- A dev **“Process now”** button on Today runs the nightly pipeline on demand
  (via a server action, so `CRON_SECRET` never reaches the browser).

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your values
npm run dev
```
