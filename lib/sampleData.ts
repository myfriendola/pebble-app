// In-memory sample content used when Supabase isn't configured (e.g. a fresh
// Vercel deploy before env vars are set), so every screen looks alive. The same
// day is also seeded into the database by schema.sql — this is the no-database
// mirror of it. Timestamps are relative to "now" so the daily reflection always
// lands on Today.

import type { Digest, Idea, ReviewItem, Task, Thought } from "./types";

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();
const daysAgo = (d: number, h = 0) => new Date(now - (d * 24 + h) * 3600_000).toISOString();
const inDays = (d: number) => new Date(now + d * 24 * 3600_000).toISOString().slice(0, 10);
const todayDate = new Date(now).toISOString().slice(0, 10);
const monthStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1)
  .toISOString()
  .slice(0, 10);

export const sampleThoughts: Thought[] = [
  {
    id: "t1",
    text: "I keep coming back to that novel on the nightstand. Reading for its own sake, not to finish it.",
    themes: ["reading again", "slowness"],
    captured_at: hoursAgo(2),
    noodle: {
      prompt: "What would it feel like to read only for the pleasure of it, with nowhere to arrive?",
      reply: null,
    },
  },
  {
    id: "t2",
    text: "There's a low hum of nerves about the launch. Not fear exactly — more like standing at the edge before the water.",
    themes: ["launch nerves", "work"],
    captured_at: hoursAgo(5),
  },
  {
    id: "t3",
    text: "Mornings feel different when I don't reach for the phone first. The light gets a minute of my attention.",
    themes: ["mornings", "slowness"],
    captured_at: hoursAgo(8),
  },
  {
    id: "t4",
    text: "Wondering if I've been mistaking being busy for being useful.",
    themes: ["launch nerves", "slowness"],
    captured_at: daysAgo(1, 3),
  },
  {
    id: "t5",
    text: "Picked the book back up on the train. Twenty pages and I forgot to check the time.",
    themes: ["reading again"],
    captured_at: daysAgo(2, 6),
  },
  {
    id: "t6",
    text: "The team meeting ran long but the quiet ten minutes after was where the real thinking happened.",
    themes: ["work", "slowness"],
    captured_at: daysAgo(3, 4),
  },
  {
    id: "t7",
    text: "A slow morning with coffee and no plan. I should protect more of these.",
    themes: ["mornings"],
    captured_at: daysAgo(4, 7),
  },
];

export const sampleIdeas: Idea[] = [
  {
    id: "i1",
    text: "What if the reading lived on a shelf by the door — pick a book up on the way out, not the phone.",
    themes: ["reading again", "mornings"],
    domain: "life",
    captured_at: hoursAgo(3),
    noodle: {
      prompt: "What's the smallest version of that you could try this week?",
      reply: null,
    },
  },
  {
    id: "i2",
    text: "An idea for the launch: a short, honest note to the first users instead of a polished announcement.",
    themes: ["launch nerves", "writing"],
    domain: "work",
    captured_at: hoursAgo(6),
  },
  {
    id: "i3",
    text: "A monthly 'slow Sunday' — no plans on purpose, just to protect the mornings I keep noticing.",
    themes: ["slowness", "mornings"],
    domain: null,
    captured_at: daysAgo(2, 5),
  },
  {
    id: "i4",
    text: "Maybe the app could nudge me to reread an old thought once a week, not just add new ones.",
    themes: ["writing", "slowness"],
    domain: "work",
    captured_at: daysAgo(3, 2),
  },
];

export const sampleWorkTasks: Task[] = [
  {
    id: "w1",
    action: "Send the launch deck to Priya for a final read",
    source_quote: "Remind me to send the deck to Priya before she logs off — she wanted a last look.",
    due: inDays(1),
    priority: "high",
    status: "open",
    captured_at: hoursAgo(4),
    domain: "work",
  },
  {
    id: "w2",
    action: "Draft the changelog for the release notes",
    source_quote: "I should write up the changelog at some point this week, nothing fancy.",
    due: null,
    priority: "normal",
    status: "open",
    captured_at: hoursAgo(6),
    domain: "work",
  },
];

export const sampleLifeTasks: Task[] = [
  {
    id: "l1",
    action: "Call Mum back this weekend",
    source_quote: "Oh — call Mum back, she left a voicemail and I keep forgetting.",
    due: inDays(2),
    priority: "normal",
    status: "open",
    captured_at: hoursAgo(7),
    domain: "life",
  },
  {
    id: "l2",
    action: "Renew the library card",
    source_quote: "The library card expired, sort that out so I can keep borrowing.",
    due: null,
    priority: null,
    status: "open",
    captured_at: daysAgo(1, 2),
    domain: "life",
  },
];

export const sampleReview: ReviewItem[] = [
  {
    id: "r1",
    capture_id: "c1",
    best_guess: { type: "task", domain: "work", confidence: 0.42, note: "Blue folder. Thursday. The thing with the numbers." },
    transcript: "Blue folder. Thursday. The thing with the numbers.",
  },
  {
    id: "r2",
    capture_id: "c2",
    best_guess: { type: "thought", domain: "life", confidence: 0.48, note: "Maybe the roses, maybe not. We'll see how it feels." },
    transcript: "Maybe the roses, maybe not. We'll see how it feels.",
  },
];

export const sampleDigests: Digest[] = [
  {
    id: "d1",
    kind: "daily",
    period_date: todayDate,
    narrative:
      "Today circled back to slowness more than once — the novel on the nightstand, the unhurried mornings, the quiet after the meeting. Underneath the launch nerves there was a gentler question about whether busy has been standing in for useful.",
    questions: [
      "Where did today feel most like your own?",
      "What would you protect if the launch were already behind you?",
    ],
    themes: ["slowness", "launch nerves", "reading again"],
    needs_review_count: 2,
  },
  {
    id: "d2",
    kind: "weekly",
    period_date: daysAgo(2).slice(0, 10),
    narrative:
      "The week kept returning to reading and to mornings — small reclaimed pockets of attention. Work pressed in around the edges, but the notes that stayed with you were the slow ones. The launch is close, and you seem to be meeting it more steadily than a week ago.",
    questions: ["Which small ritual do you want to carry into next week?"],
    themes: ["reading again", "mornings", "launch nerves"],
    needs_review_count: 0,
  },
  {
    id: "d3",
    kind: "monthly",
    period_date: monthStart,
    narrative:
      "A month of learning to move a little slower on purpose. Reading came back. The phone lost a few of its mornings. The work anxieties didn't vanish, but they shared the room with something calmer. A theme took shape: usefulness measured less by motion.",
    questions: ["What did slowing down make room for this month?"],
    themes: ["slowness", "reading again", "mornings"],
    needs_review_count: 0,
  },
];
