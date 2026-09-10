// Server-side read layer. Queries Supabase when configured; otherwise (or on
// any error) falls back to the in-memory sample day so the screens are never
// empty. Import only from server components / actions.

import { getSupabase } from "./supabase";
import type { Digest, Idea, ReviewItem, Task, Thought } from "./types";
import {
  sampleDigests,
  sampleIdeas,
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

type Noodleable = { id: string; noodle?: { prompt: string; reply: string | null } | null };

// Attach the most recent noodle (question + reply) to each thought or idea,
// keyed by the given foreign-key column.
async function attachNoodles<T extends Noodleable>(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  items: T[],
  column: "thought_id" | "idea_id",
): Promise<T[]> {
  if (items.length === 0) return items;
  const ids = items.map((t) => t.id);
  const { data } = await supabase
    .from("noodles")
    .select(`${column}, prompt, reply, created_at`)
    .in(column, ids)
    .order("created_at", { ascending: false });

  const latest = new Map<string, { prompt: string; reply: string | null }>();
  for (const row of (data ?? []) as Record<string, string | null>[]) {
    const key = row[column];
    if (key && !latest.has(key)) {
      latest.set(key, { prompt: row.prompt as string, reply: row.reply });
    }
  }
  return items.map((t) => ({ ...t, noodle: latest.get(t.id) ?? t.noodle ?? null }));
}

// When Supabase is configured, always return the real rows — even an empty
// list, so the screens show a calm empty state rather than sample content.
// Sample data is only for the no-database preview.
export async function getAllThoughts(): Promise<Thought[]> {
  const supabase = getSupabase();
  if (!supabase) return sampleThoughts;
  try {
    const { data, error } = await supabase
      .from("thoughts")
      .select("id, text, themes, captured_at, created_at")
      .order("captured_at", { ascending: false });
    if (error) return [];
    return attachNoodles(supabase, (data ?? []) as Thought[], "thought_id");
  } catch {
    return [];
  }
}

export async function getAllIdeas(): Promise<Idea[]> {
  const supabase = getSupabase();
  if (!supabase) return sampleIdeas;
  try {
    const { data, error } = await supabase
      .from("ideas")
      .select("id, text, themes, domain, captured_at, created_at")
      .order("captured_at", { ascending: false });
    if (error) return [];
    return attachNoodles(supabase, (data ?? []) as Idea[], "idea_id");
  } catch {
    return [];
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
    return { work, life };
  } catch {
    return { work: [], life: [] };
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
    if (error) return [];
    return (data ?? []) as Digest[];
  } catch {
    return [];
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
    if (error || !data) return [];
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
    return [];
  }
}

export async function getThoughtById(id: string): Promise<Thought | null> {
  const supabase = getSupabase();
  if (!supabase) return sampleThoughts.find((t) => t.id === id) ?? null;
  try {
    const { data } = await supabase
      .from("thoughts")
      .select("id, text, themes, captured_at, created_at")
      .eq("id", id)
      .limit(1)
      .maybeSingle();
    if (data) {
      const [withNoodle] = await attachNoodles(supabase, [data as Thought], "thought_id");
      return withNoodle;
    }
  } catch {
    /* not found */
  }
  return null;
}

export async function getIdeaById(id: string): Promise<Idea | null> {
  const supabase = getSupabase();
  if (!supabase) return sampleIdeas.find((t) => t.id === id) ?? null;
  try {
    const { data } = await supabase
      .from("ideas")
      .select("id, text, themes, domain, captured_at, created_at")
      .eq("id", id)
      .limit(1)
      .maybeSingle();
    if (data) {
      const [withNoodle] = await attachNoodles(supabase, [data as Idea], "idea_id");
      return withNoodle;
    }
  } catch {
    /* not found */
  }
  return null;
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
  ideasToday: Idea[];
  tasksToday: Task[];
  reviewItems: ReviewItem[];
  reviewCount: number;
}

export async function getToday(): Promise<TodayData> {
  const [thoughts, ideas, tasks, digests, reviewItems] = await Promise.all([
    getAllThoughts(),
    getAllIdeas(),
    getTasks(),
    getDigests(),
    getReviewItems(),
  ]);

  const thoughtsToday = thoughts.filter((t) => isToday(t.captured_at));
  const ideasToday = ideas.filter((t) => isToday(t.captured_at));
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
    thoughtsToday,
    ideasToday,
    tasksToday: tasksToday.slice(0, 5),
    reviewItems,
    reviewCount: reviewItems.length,
  };
}

// All distinct themes across items with theme tags, most-used first — for the
// Thoughts and Ideas filters.
export function collectThemes(items: { themes: string[] }[]): string[] {
  const counts = new Map<string, number>();
  for (const t of items) {
    for (const theme of t.themes) counts.set(theme, (counts.get(theme) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([theme]) => theme);
}
