# Your Pebble Index App — Complete Build Guide (Fully Online)

Build the calm, sanctuary-style app we designed **entirely in the browser** on your
personal account — nothing installed or run on your laptop.

- **Build:** Claude Code on the web (claude.ai/code), running in Anthropic's cloud.
- **Code lives in:** a GitHub repo.
- **Hosted & previewed on:** Vercel (a live URL, always up, never localhost).
- **Data, webhook, schedules:** Supabase.

The design, data model, and AI prompts are identical to what we agreed — only *where
the building happens* and *how you preview* have changed.

---

## How to use this guide

- **Parts 1, 2, 6, 7, 8** are things *you* do by hand in the browser. Click-by-click.
- **Parts 3–5** are the *spec Claude Code builds from*. You'll upload this whole file
  into your repo, and the kickoff task in Part 2 points Claude Code at it.
- Do the parts in order. Each ends with a **✅ Checkpoint**.

---

## Part 0 — The mental model (read once)

Two pieces. You already own the first.

1. **Capture** — your Index 01 ring + the Pebble phone app. You speak, it transcribes,
   and its *native webhook* sends the text to a web address you choose. No Brain Dump
   or other app needed.
2. **Your app** — a web app that receives that text, sorts it, summarizes it, shows it.

And the *building* of piece 2 also happens in the cloud: Claude Code on the web runs
in an Anthropic-managed sandbox, edits your GitHub repo, and opens pull requests. Your
laptop only ever runs a browser.

The flow once it's live:

```
Ring → Pebble app (transcribes) → webhook POST → YOUR APP (on Vercel)
   → sorts each note (task or thought? work or life?)
   → tasks → Work / Life  ·  thoughts → theme tags
   → nightly: writes the daily reflection
   → weekly (Sun) & monthly (1st): wider reflections
```

---

## Part 1 — Accounts and keys (all in the browser)

You need five logins. All have free tiers that cover personal use.

### 1a. Your Claude plan
Claude Code on the web needs a **Pro or Max** plan on your personal account. Confirm
yours is one of these at claude.ai (Settings → Billing).

### 1b. OpenAI API key (the model the app uses to sort & summarize)
1. Go to **platform.openai.com** → sign in → **API keys** → **Create new secret key**. Name it `pebble-app`.
2. Copy the key (starts with `sk-`). Save it somewhere safe for later.
3. Add a few dollars of credit under **Settings → Billing** — lasts a long time at personal volume.
   *(This is the key your app uses at runtime — separate from the Claude Pro/Max plan you use to build it.)*

### 1c. Supabase (your database)
1. **supabase.com** → **New project**. Name it `pebble`, set a strong DB password, save it.
2. Wait ~2 min. Then **Project Settings → API** and copy:
   - **Project URL** (like `https://abcd.supabase.co`)
   - **service_role key** (the secret one — not the anon key)

### 1d. GitHub (where the code lives)
1. **github.com** → sign up (free) if you don't have an account.
2. Create a **new repository**, name it `pebble-app`, set it **Private**, and tick
   "Add a README" so it isn't empty. Create it.

### 1e. Vercel (hosting + your live preview)
1. **vercel.com** → **Sign Up** → **Continue with GitHub**. That links the two.
2. Nothing else yet — you'll import the repo in Part 6.

**✅ Checkpoint:** You have a Pro/Max Claude plan, an OpenAI `sk-` key, a
Supabase URL + service_role key, a private `pebble-app` GitHub repo, and a Vercel
account linked to GitHub.

---

## Part 2 — Set up the online build loop

### 2a. Put this guide into your repo (so Claude Code can read it)
1. On your `pebble-app` repo page on github.com, click **Add file → Upload files**.
2. Drag this markdown file in, name it `build-guide.md`, and **Commit changes**.
   (All in the browser — no download-to-laptop needed.)

### 2b. Connect the repo to Claude Code on the web
1. Go to **claude.ai/code** on your personal account.
2. **Connect GitHub** and authorize access to your `pebble-app` repo.

### 2c. Kick off the build
Create a new task on the `pebble-app` repo and paste the **kickoff task** at the bottom
of this guide (the "── PASTE INTO claude.ai/code ──" block). Claude Code will build in
the cloud and open a **pull request** when done — nothing runs on your machine.

**✅ Checkpoint:** Claude Code on the web is working on your repo and will return a PR.

---

## Part 3 — The spec Claude Code builds from

*(This is the design + data model. It's already in `build-guide.md` in your repo, so
Claude Code reads it directly — you don't paste it anywhere.)*

### App overview
A personal web app. Voice-note transcriptions arrive from a Pebble Index 01 ring via
webhook. Each note is classified as a **task** or a **thought**, and as **work** or
**life**. Tasks appear in a Work/Life task view, each keeping the user's original
spoken words. Thoughts appear as a browsable, theme-filterable stream. A nightly job
writes a daily reflection; weekly and monthly jobs write wider ones. Single user, no
login needed for v1.

### Stack
- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase** (Postgres) via `@supabase/supabase-js`, server-side, service_role key
- **OpenAI SDK** (`openai`), model `gpt-4o-mini` (a cheap, current model; confirm the
  latest low-cost model string in the OpenAI docs and use that)
- Hosted on **Vercel**; scheduled jobs via **Vercel Cron**

### Environment variables (read from `process.env`; values set in Vercel, never hardcoded)
```
OPENAI_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CAPTURE_SECRET        (a long random string you invent)
CRON_SECRET           (another long random string)
```

### Database schema (Claude Code emits this as schema.sql; you run it in Supabase)
- **captures**: `id` (uuid pk), `transcript` (text), `captured_at` (timestamptz), `processed` (bool default false), `created_at` (timestamptz default now)
- **thoughts**: `id`, `text` (text), `themes` (text[]), `captured_at`, `created_at`
- **work_tasks**: `id`, `action` (text), `source_quote` (text), `due` (date null), `priority` (text null), `status` (text default 'open'), `captured_at`, `created_at`
- **life_tasks**: same columns as work_tasks
- **noodles**: `id`, `thought_id` (fk → thoughts), `prompt` (text), `reply` (text null), `created_at`
- **digests**: `id`, `kind` (text: 'daily'|'weekly'|'monthly'), `period_date` (date), `narrative` (text), `questions` (text[]), `themes` (text[]), `needs_review_count` (int default 0), `created_at`
- **review_queue**: `id`, `capture_id` (fk), `best_guess` (jsonb), `created_at`

### Design system (match exactly — it's the whole point)
Feeling: a **calm, minimal sanctuary**. Warm paper, the user's words in a serif, tasks
hushed, one muted sage accent, hairlines and whitespace instead of boxes. No shadows,
no gradients, nothing loud.

- **Background (paper):** `#F5F1EA`. Evening reflection panel: `#F1EFE8`.
- **Ink:** primary `#2C2C2A`, secondary `#5F5E5A`, muted `#888780`.
- **Sage accent:** text/icons `#0F6E56`; tint `#E1F5EE`; rings/borders `#9FE1CB`, `#5DCAA5`.
- **Tags:** work = `#0F6E56` on `#E1F5EE`; life = `#5F5E5A` on `#F1EFE8`.
- **Fonts:** UI/labels/actions in a clean sans (**Inter**). Thoughts, spoken quotes,
  reflection narratives, and the app's gentle questions in a **serif** (**Newsreader**
  or Lora, via Google Fonts). The app's *questions* are serif **italic**, secondary
  color — a softer voice, distinct from the user's own words.
- **Radius:** cards `12px`, controls `8px`, pills `999px`.
- **Type:** screen titles 18px/500; thought & quote text 16–17px serif, line-height 1.6;
  labels 11–12px uppercase, letter-spacing 0.06em, muted; task actions 15px sans.
- **Motion:** gentle fades on load; nothing snaps.

### Navigation
A slim **left icon rail** (54px): Today (`sun`), Thoughts (`message-circle`), Tasks
(`checkbox`), Reflections (`moon`). Only the active icon carries the sage tint. On
phone widths (< ~640px) it folds into a **bottom bar** with the same four icons and
identical behavior.

### Screens

**Today** — the home you glance at all day.
- Top zone: the date and one evolving serif sentence ("where your head's at").
- In the **evening**, that same top zone *blooms* into the full daily reflection: a warm
  paper panel (`#F1EFE8`) with the narrative (serif), one "question to sit with" (serif
  italic), and one quiet actionable row — "Review how today sorted" with a small "N to
  check" sage pill and a chevron (opens the review queue). Reflection is never a buried
  tab; it's the top of Today, deepening as the day closes.
- Below: **Thoughts today** — the day's thoughts in serif, each timestamped, separated by
  hairlines. Tap to open the inline noodle.
- Below that: **To do** — a short, hushed list; sage dot for work, gray dot for life,
  tiny tag; secondary to the thinking above.

**Inline noodle** (Today & Thoughts): tapping a thought expands a block *directly
beneath it*, marked with a sage left-edge (`#9FE1CB`, 2px): a small "Noodling" label,
the app's gentle question in serif italic, a reply field, and a quiet "Open as its own
page ↗" link that expands to a focused one-thought view **only if the user chooses**.
Inline is always the starting point.

**Thoughts** — a browsable stream. Title, then theme filter pills (sage when active).
Selecting a theme pulls every thought on that thread together across days, grouped by
day, so a recurring undercurrent becomes visible — the raw material for the weekly and
monthly reflections. Each thought is serif with a timestamp; tap to noodle inline.

**Tasks** — two worlds, one at a time. Title, then a calm **Work / Life toggle** (pill
segmented control, active = sage tint). Each task: a soft sage **check ring** (not a
hard checkbox), the action in clean sans, an optional whispered due date (muted, small
calendar icon, no red urgency), and — the soul of this screen — the user's **original
spoken words** beneath in serif italic secondary with a pale sage left-edge (`#E1F5EE`).
The action says *what to do*; the quote preserves *why they said it*.

**Reflections** — saved daily / weekly / monthly reflections, plus a theme-over-time
view. Inherits everything above; no new components.

---

## Part 4 — The three AI prompts (the soul of the app)

Claude Code puts each in `lib/prompts/`. Use these **exact** prompts. Each AI call sends
user content and returns **only valid JSON** — use OpenAI's JSON mode
(`response_format: { type: "json_object" }`) and still strip any stray ```` ```json ````
fences before parsing as a safeguard.

### 4a. `sort.ts` — classify each capture
```
You sort a person's spoken brain-dump notes. For each note, decide:
- type: "task" if it's something to do, else "thought"
- domain: "work" (professional) or "life" (personal)
- For tasks: action (a short clear rewrite of what to do), due (ISO date or null),
  priority ("high"|"normal"|null), source_quote (the person's original wording)
- For thoughts: themes (1–3 short lowercase tags, reused when a topic recurs —
  e.g. "reading again", "launch nerves")
- confidence: 0.0–1.0 for type + domain
Return ONLY a JSON array, one object per note, no prose.
```
Code rule: if `confidence < 0.6`, write the item to `review_queue` instead of
committing it, and increment the day's `needs_review_count`.

### 4b. `summarize.ts` — write a reflection
```
You write a short, calm daily reflection for one person, from their thoughts and
tasks today. Voice: warm, plain, unhurried — like a thoughtful friend, never a
productivity coach. Notice what recurred and what sits underneath the busy stuff.
Return ONLY JSON:
{
  "narrative": "2–3 sentences on where their head was today",
  "questions": ["1–2 gentle questions to sit with, second person"],
  "themes": ["the day's threads as short lowercase tags"]
}
Do not give advice or to-dos. Do not use the words "productivity" or "optimize".
```
**Weekly** (Sundays) and **monthly** (the 1st) use the same shape over a wider window,
asking for the arc: what recurred, what shifted, what faded.

### 4c. `noodle.ts` — a gentle question back
```
The person tapped one of their own thoughts to explore it. Ask ONE short, open,
gentle question that helps them go a little deeper — curious, never leading, never
advice. If related past thoughts are provided, you may gently draw the thread.
Return ONLY JSON: { "question": "..." }
On later turns, continue the reflection conversationally, one question at a time.
```

---

## Part 5 — The webhook and the scheduled jobs

### 5a. `POST /api/capture` — receives notes from the ring
- Parse the Pebble webhook payload; pull out the transcription text and a timestamp.
- Require a shared secret: check `?secret=` equals `CAPTURE_SECRET`; reject otherwise.
- Insert into `captures` with `processed=false`. Respond `200` quickly.

### 5b. `POST /api/cron/nightly` — the end-of-day pass
- Require header `Authorization: Bearer ${CRON_SECRET}`.
- Load `captures` where `processed=false`. Run the **sort** prompt. Commit results to
  `thoughts` / `work_tasks` / `life_tasks` (or `review_queue` if low-confidence). Mark
  those captures `processed=true`.
- Then run the **daily summarize** prompt over today's thoughts + tasks; write a
  `digests` row (`kind='daily'`).

### 5c. `POST /api/cron/weekly` and `/api/cron/monthly`
- Same protection. Run the weekly/monthly summarize over the wider window; write digests.

### 5d. `vercel.json` — schedule them
```json
{
  "crons": [
    { "path": "/api/cron/nightly", "schedule": "0 5 * * *" },
    { "path": "/api/cron/weekly",  "schedule": "0 6 * * 0" },
    { "path": "/api/cron/monthly", "schedule": "0 6 1 * *" }
  ]
}
```
Times are UTC (`0 5 * * *` ≈ late evening in the Americas) — adjust to your timezone.

### 5e. A browser-only test button
So you can test without a terminal, Claude Code also adds a small **dev-only "Process
now"** action on the Today screen that calls `/api/cron/nightly` with the secret. That
runs the whole sort-and-summarize pipeline on demand, from the browser.

---

## Part 6 — Review the PR and go live (all in the browser)

1. Open the **pull request** Claude Code created. Skim the summary and the preview.
2. **Merge** it on github.com.
3. Go to **vercel.com → Add New → Project**, import your `pebble-app` repo, click through.
4. Before it finishes, open **Settings → Environment Variables** and add all five from
   Part 3 (paste your real OpenAI key, Supabase URL + service_role key, and invent
   the two secret strings). **Redeploy.**
5. In Supabase → **SQL Editor**, paste the contents of `schema.sql` from the repo and
   **Run** it to create the tables.

Now every future merge auto-deploys, and Vercel gives you a live URL like
`https://pebble-app-you.vercel.app` — **that's your always-online preview.**

**✅ Checkpoint:** The app loads at its Vercel URL (screens visible, seeded examples),
and your capture endpoint is public at `https://<your-app>.vercel.app/api/capture`.

---

## Part 7 — Connect your ring

1. In the **Pebble app** on your phone → Index settings → **Webhook** (under advanced /
   integrations).
2. Set the URL to:
   `https://<your-app>.vercel.app/api/capture?secret=YOUR_CAPTURE_SECRET`
   (same `CAPTURE_SECRET` you set in Vercel).
3. Set it to send the **transcription** on each recording.

**✅ Checkpoint:** Say a test note (or type one into the Pebble app's Index feed for
speed). A new row appears in Supabase → **captures**.

---

## Part 8 — First real run

1. Capture a handful of notes across a day — mix to-dos ("remind me to send the deck")
   with open thoughts ("I keep thinking about…").
2. Open your app and tap the dev **"Process now"** button (or, in Vercel → your project
   → **Cron Jobs**, use **Run** on the nightly job). Either triggers the pipeline from
   the browser — no terminal.
3. See it work: tasks sorted into Work/Life with your spoken words beneath, thoughts in
   the stream with themes, and the day's reflection settled at the top of Today.

**✅ You're live.** From here you wear the ring and talk; the app does the rest each
night. Iterate by sending Claude Code on the web a new task → review the PR → check the
Vercel preview → merge.

---

## Good next iterations (later)
- Tune the sort prompt on your own real notes until the work/life split feels right.
- Add the theme-over-time chart on Reflections once you have a few weeks of data.
- Route explicit time-based reminders ("call John at 3") to commit immediately.
- Add a simple passcode before sharing the URL.

## If something breaks
- **Nothing in `captures`:** webhook URL or `secret` wrong, or the Pebble app isn't
  sending transcriptions. Test by typing into the Index feed.
- **Notes arrive but never sort:** the nightly job hasn't run (use "Process now"), or the
  OpenAI key/credit is missing. Check the Vercel function logs.
- **JSON errors from the AI:** ensure each prompt says "return ONLY JSON" and the code
  strips stray ```` ```json ```` fences before parsing.

---

────────────── PASTE INTO claude.ai/code (the kickoff task) ──────────────

Read build-guide.md in this repo's root first, completely — it is the full spec, and
Parts 3, 4, and 5 are the source of truth for the design system, the three AI prompts,
and the webhook + cron. Follow it exactly.

Build the entire app in one pass, then open a pull request:

1. Scaffold Next.js (App Router) + TypeScript + Tailwind at the repo root. Add
   @supabase/supabase-js and openai.
2. Create schema.sql with CREATE TABLE statements for every table in Part 3 (I'll run
   it in Supabase myself).
3. Read all config from process.env (OPENAI_API_KEY, SUPABASE_URL,
   SUPABASE_SERVICE_ROLE_KEY, CAPTURE_SECRET, CRON_SECRET). Do NOT hardcode secrets and
   do NOT ask me for their values — I set them in Vercel.
4. Build lib/prompts/{sort,summarize,noodle}.ts using the EXACT prompts in Part 4, each
   returning safely-parsed JSON (use OpenAI JSON mode; strip ```json fences). Enforce confidence < 0.6 →
   review_queue.
5. Build the routes in Part 5: POST /api/capture (secret-checked) and
   POST /api/cron/{nightly,weekly,monthly} (Bearer CRON_SECRET), plus vercel.json with
   the three schedules. Also add a dev-only "Process now" button on the Today screen
   that calls /api/cron/nightly so I can test the pipeline from the browser.
6. Build all four screens EXACTLY to the Part 3 design tokens — Today (day + evening
   reflection states), Thoughts (theme filter), Tasks (Work/Life toggle + spoken-quote
   echo), Reflections — plus the side-rail nav that folds to a bottom bar on phones.
   Warm paper #F5F1EA; serif (Newsreader) for thoughts, quotes, reflections and the
   app's italic questions; clean sans (Inter) for UI; sage accent; hairlines and
   whitespace, not boxes. Calm and minimal: no shadows, no gradients.
7. Seed a few example rows so the screens aren't empty.
8. Open a PR summarizing what you built and the exact steps I must do: run schema.sql in
   Supabase, set the five Vercel env vars, set the Pebble webhook URL.

Prioritize the look and feel above everything — this app lives or dies on whether it
feels like a calm sanctuary. If any choice isn't specified, ask in the PR rather than
guessing.

──────────────────────────────────────────────────────────────────────────
