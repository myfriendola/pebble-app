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
  sampleThemeGroups,
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
// `limit` caps the rows fetched so the stream doesn't load every note ever as
// the archive grows; the screens page with a "Show earlier" affordance. Omit
// it only for callers that truly need the whole set.
export async function getAllThoughts(limit?: number): Promise<Thought[]> {
  const supabase = getSupabase();
  if (!supabase) return sampleThoughts;
  try {
    let q = supabase
      .from("thoughts")
      .select("id, text, themes, captured_at, created_at")
      .order("captured_at", { ascending: false });
    if (limit) q = q.limit(limit);
    const { data, error } = await q;
    if (error) return [];
    return attachNoodles(supabase, (data ?? []) as Thought[], "thought_id");
  } catch {
    return [];
  }
}

export async function getAllIdeas(limit?: number): Promise<Idea[]> {
  const supabase = getSupabase();
  if (!supabase) return sampleIdeas;
  try {
    let q = supabase
      .from("ideas")
      .select("id, text, themes, domain, captured_at, created_at")
      .order("captured_at", { ascending: false });
    if (limit) q = q.limit(limit);
    const { data, error } = await q;
    if (error) return [];
    return attachNoodles(supabase, (data ?? []) as Idea[], "idea_id");
  } catch {
    return [];
  }
}

// Tasks are more bounded than the thought stream, but cap them too so a long
// history of done items can't balloon the Tasks screen.
export async function getTasks(): Promise<{ work: Task[]; life: Task[] }> {
  const supabase = getSupabase();
  if (!supabase) return { work: sampleWorkTasks, life: sampleLifeTasks };
  try {
    const [w, l] = await Promise.all([
      supabase.from("work_tasks").select("*").order("captured_at", { ascending: false }).limit(250),
      supabase.from("life_tasks").select("*").order("captured_at", { ascending: false }).limit(250),
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
  // Today only needs the most recent slice (it filters to today), so a modest
  // window keeps this light no matter how large the archive grows.
  const [thoughts, ideas, tasks, digests, reviewItems] = await Promise.all([
    getAllThoughts(80),
    getAllIdeas(80),
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

// The most recent thought/idea where you began a gentle question but haven't
// answered it yet — a soft on-ramp back into reflection, surfaced on Today.
export async function getOpenNoodle(): Promise<
  { kind: "thought" | "idea"; id: string; text: string; prompt: string } | null
> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from("noodles")
      .select("thought_id, idea_id, prompt, reply, created_at")
      .is("reply", null)
      .order("created_at", { ascending: false })
      .limit(10);
    for (const row of (data ?? []) as Record<string, string | null>[]) {
      const prompt = row.prompt ?? "";
      if (!prompt) continue;
      if (row.thought_id) {
        const { data: t } = await supabase
          .from("thoughts")
          .select("id, text")
          .eq("id", row.thought_id)
          .maybeSingle();
        if (t) return { kind: "thought", id: (t as Thought).id, text: (t as Thought).text, prompt };
      } else if (row.idea_id) {
        const { data: i } = await supabase
          .from("ideas")
          .select("id, text")
          .eq("id", row.idea_id)
          .maybeSingle();
        if (i) return { kind: "idea", id: (i as Idea).id, text: (i as Idea).text, prompt };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// When the newest voice note arrived — so a silently broken webhook is visible
// at a glance. Null when there are no captures yet (or no database).
export async function getLastCaptureAt(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from("captures")
      .select("captured_at")
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as { captured_at?: string } | null)?.captured_at ?? null;
  } catch {
    return null;
  }
}

// theme → group name, from the nightly clustering. Empty when it hasn't run.
export async function getThemeGroupMap(): Promise<Record<string, string>> {
  const supabase = getSupabase();
  if (!supabase) return sampleThemeGroups;
  try {
    const { data, error } = await supabase.from("theme_groups").select("theme, grp");
    if (error || !data) return {};
    const map: Record<string, string> = {};
    for (const row of data) {
      const r = row as { theme: string; grp: string };
      map[r.theme] = r.grp;
    }
    return map;
  } catch {
    return {};
  }
}

