// Server-side read layer. Queries Supabase when configured; otherwise (or on
// any error) falls back to the in-memory sample day so the screens are never
// empty. Import only from server components / actions.

import { getSupabase } from "./supabase";
import type { Digest, ReviewItem, Task, Thought } from "./types";
import {
  sampleDigests,
  sampleLifeTasks,
  sampleReview,
  sampleThoughts,
  sampleWorkTasks,
} from "./sampleData";

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function isToday(iso: string): boolean {
  return iso >= startOfToday();
}

// Attach the most recent noodle (question + reply) to each thought.
async function attachNoodles(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  thoughts: Thought[],
): Promise<Thought[]> {
  if (thoughts.length === 0) return thoughts;
  const ids = thoughts.map((t) => t.id);
  const { data } = await supabase
    .from("noodles")
    .select("thought_id, prompt, reply, created_at")
    .in("thought_id", ids)
    .order("created_at", { ascending: false });

  const latest = new Map<string, { prompt: string; reply: string | null }>();
  for (const row of data ?? []) {
    if (!latest.has(row.thought_id)) {
      latest.set(row.thought_id, { prompt: row.prompt, reply: row.reply });
    }
  }
  return thoughts.map((t) => ({ ...t, noodle: latest.get(t.id) ?? t.noodle ?? null }));
}

export async function getAllThoughts(): Promise<Thought[]> {
  const supabase = getSupabase();
  if (!supabase) return sampleThoughts;
  try {
    const { data, error } = await supabase
      .from("thoughts")
      .select("id, text, themes, captured_at, created_at")
      .order("captured_at", { ascending: false });
    if (error || !data || data.length === 0) return sampleThoughts;
    return attachNoodles(supabase, data as Thought[]);
  } catch {
    return sampleThoughts;
  }
}

export async function getTasks(): Promise<{ work: Task[]; life: Task[] }> {
  const supabase = getSupabase();
  if (!supabase) return { work: sampleWorkTasks, life: sampleLifeTasks };
  try {
    const [w, l] = await Promise.all([
      supabase.from("work_tasks").select("*").order("captured_at", { ascending: false }),
      supabase.from("life_tasks").select("*").order("captured_at", { ascending: false }),
    ]);
    const work = (w.data ?? []).map((t) => ({ ...t, domain: "work" as const }));
    const life = (l.data ?? []).map((t) => ({ ...t, domain: "life" as const }));
    if (work.length === 0 && life.length === 0) {
      return { work: sampleWorkTasks, life: sampleLifeTasks };
    }
    return { work, life };
  } catch {
    return { work: sampleWorkTasks, life: sampleLifeTasks };
  }
}

export async function getDigests(): Promise<Digest[]> {
  const supabase = getSupabase();
  if (!supabase) return sampleDigests;
  try {
    const { data, error } = await supabase
      .from("digests")
      .select("*")
      .order("period_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error || !data || data.length === 0) return sampleDigests;
    return data as Digest[];
  } catch {
    return sampleDigests;
  }
}

export async function getReviewItems(): Promise<ReviewItem[]> {
  const supabase = getSupabase();
  if (!supabase) return sampleReview;
  try {
    const { data, error } = await supabase
      .from("review_queue")
      .select("id, capture_id, best_guess, created_at, captures(transcript)")
      .order("created_at", { ascending: false });
    if (error || !data) return sampleReview;
    return data.map((r) => ({
      id: r.id,
      capture_id: r.capture_id,
      best_guess: r.best_guess,
      // captures(transcript) comes back as a nested object.
      transcript:
        (r as { captures?: { transcript?: string } | null }).captures?.transcript ??
        (r.best_guess as { note?: string } | null)?.note ??
        null,
      created_at: r.created_at,
    }));
  } catch {
    return sampleReview;
  }
}

export async function getThoughtById(id: string): Promise<Thought | null> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase
        .from("thoughts")
        .select("id, text, themes, captured_at, created_at")
        .eq("id", id)
        .limit(1)
        .maybeSingle();
      if (data) {
        const [withNoodle] = await attachNoodles(supabase, [data as Thought]);
        return withNoodle;
      }
    } catch {
      /* fall through to sample lookup */
    }
  }
  return sampleThoughts.find((t) => t.id === id) ?? null;
}

// A gentle serif sentence for the top of Today when there's no reflection yet.
export function dayLineFromThoughts(thoughts: Thought[]): string {
  const today = thoughts.filter((t) => isToday(t.captured_at));
  if (today.length === 0) {
    return "A quiet start. Speak when something surfaces.";
  }
  const themes = Array.from(new Set(today.flatMap((t) => t.themes))).slice(0, 2);
  if (themes.length === 0) {
    return "A few things have surfaced today.";
  }
  if (themes.length === 1) {
    return `Today keeps circling back to ${themes[0]}.`;
  }
  return `Today keeps circling back to ${themes[0]} and ${themes[1]}.`;
}

export interface TodayData {
  date: string;
  dayLine: string;
  dailyDigest: Digest | null;
  thoughtsToday: Thought[];
  tasksToday: Task[];
  reviewItems: ReviewItem[];
  reviewCount: number;
}

export async function getToday(): Promise<TodayData> {
  const [thoughts, tasks, digests, reviewItems] = await Promise.all([
    getAllThoughts(),
    getTasks(),
    getDigests(),
    getReviewItems(),
  ]);

  const thoughtsToday = thoughts.filter((t) => isToday(t.captured_at));
  const tasksToday = [...tasks.work, ...tasks.life]
    .filter((t) => t.status !== "done")
    .sort((a, b) => (a.captured_at < b.captured_at ? 1 : -1));

  const todayStr = new Date().toISOString().slice(0, 10);
  const dailyDigest =
    digests.find((d) => d.kind === "daily" && d.period_date.slice(0, 10) === todayStr) ?? null;

  return {
    date: new Date().toISOString(),
    dayLine: dayLineFromThoughts(thoughts),
    dailyDigest,
    thoughtsToday: thoughtsToday.length > 0 ? thoughtsToday : thoughts.slice(0, 3),
    tasksToday: tasksToday.slice(0, 5),
    reviewItems,
    reviewCount: reviewItems.length,
  };
}

// All distinct themes across thoughts, most-used first — for the Thoughts filter.
export function collectThemes(thoughts: Thought[]): string[] {
  const counts = new Map<string, number>();
  for (const t of thoughts) {
    for (const theme of t.themes) counts.set(theme, (counts.get(theme) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([theme]) => theme);
}
