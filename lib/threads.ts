// Threads: reading. Loads threads, their notes and the pending suggestion.
// The AI work (noticing, gathering, reading) lives in threadWork.ts.
//
// Everything here degrades quietly: before the Threads SQL has been run, the
// tables are missing and callers get empty results plus a `missing` flag, so
// the rest of the app is unaffected.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import type {
  ItemRef,
  Thread,
  ThreadItemKind,
  ThreadNote,
  ThreadSuggestion,
  ThreadSummary,
} from "./types";

type Db = SupabaseClient;

// PostgREST reports a table that doesn't exist as 42P01 (Postgres) or
// PGRST205 (schema cache).
export function isMissingTable(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /does not exist|could not find the table/i.test(error.message ?? "")
  );
}

const KINDS: ThreadItemKind[] = ["thought", "idea", "work_task", "life_task"];
const TABLE: Record<ThreadItemKind, string> = {
  thought: "thoughts",
  idea: "ideas",
  work_task: "work_tasks",
  life_task: "life_tasks",
};

export const isTask = (k: ThreadItemKind) => k === "work_task" || k === "life_task";
export const refKey = (r: ItemRef) => `${r.kind}:${r.id}`;

type Row = Record<string, unknown>;
function toNote(kind: ThreadItemKind, r: Row): ThreadNote {
  const task = isTask(kind);
  return {
    kind,
    id: String(r.id),
    text: String((task ? r.action : r.text) ?? ""),
    quote: task ? ((r.source_quote as string | null) ?? null) : null,
    themes: Array.isArray(r.themes) ? (r.themes as string[]) : [],
    status: task ? String(r.status ?? "open") : null,
    captured_at: String(r.captured_at ?? r.created_at ?? new Date().toISOString()),
  };
}

function columns(kind: ThreadItemKind) {
  return isTask(kind)
    ? "id, action, source_quote, status, captured_at"
    : "id, text, themes, captured_at";
}

// Notes across thoughts, ideas and tasks, newest first. Either the latest
// `limit` (optionally since a date), or exactly the given refs.
export async function loadNotes(
  supabase: Db,
  opts: { since?: string; limit?: number; refs?: ItemRef[] } = {},
): Promise<ThreadNote[]> {
  const out: ThreadNote[] = [];
  if (opts.refs) {
    for (const kind of KINDS) {
      const ids = Array.from(new Set(opts.refs.filter((r) => r.kind === kind).map((r) => r.id)));
      // Chunk so the request URL stays short.
      for (let i = 0; i < ids.length; i += 80) {
        const { data } = await supabase
          .from(TABLE[kind])
          .select(columns(kind))
          .in("id", ids.slice(i, i + 80));
        for (const r of (data ?? []) as unknown as Row[]) out.push(toNote(kind, r));
      }
    }
  } else {
    const limit = opts.limit ?? 400;
    const results = await Promise.all(
      KINDS.map((kind) => {
        let q = supabase
          .from(TABLE[kind])
          .select(columns(kind))
          .order("captured_at", { ascending: false })
          .limit(limit);
        if (opts.since) q = q.gte("captured_at", opts.since);
        return q;
      }),
    );
    results.forEach((res, i) => {
      for (const r of (res.data ?? []) as unknown as Row[]) out.push(toNote(KINDS[i], r));
    });
  }
  out.sort((a, b) => (a.captured_at < b.captured_at ? 1 : -1));
  return opts.refs || !opts.limit ? out : out.slice(0, opts.limit);
}

// The person's threads, for the sort prompt (so new notes can join them).
export async function threadsForSort(
  supabase: Db,
): Promise<{ id: string; title: string; description: string | null }[]> {
  try {
    const { data, error } = await supabase
      .from("threads")
      .select("id, title, description")
      .order("created_at", { ascending: true })
      .limit(30);
    if (error) return [];
    return (data ?? []) as { id: string; title: string; description: string | null }[];
  } catch {
    return [];
  }
}

// Add notes to a thread. Never resurrects one you removed ("not about this").
export async function addThreadItems(
  supabase: Db,
  threadId: string,
  refs: ItemRef[],
  addedBy: "pebble" | "you" = "pebble",
): Promise<void> {
  if (refs.length === 0) return;
  const rows = refs.map((r) => ({
    thread_id: threadId,
    item_kind: r.kind,
    item_id: r.id,
    added_by: addedBy,
  }));
  await supabase
    .from("thread_items")
    .upsert(rows, { onConflict: "thread_id,item_kind,item_id", ignoreDuplicates: true });
}

// ── Screens ─────────────────────────────────────────────────────────────────

export async function getThreadSummaries(): Promise<{ threads: ThreadSummary[]; missing: boolean }> {
  const supabase = getSupabase();
  if (!supabase) return { threads: [], missing: false };
  try {
    const { data, error } = await supabase
      .from("threads")
      .select("id, title, description, created_at")
      .order("created_at", { ascending: false });
    if (error) return { threads: [], missing: isMissingTable(error) };

    const { data: items } = await supabase
      .from("thread_items")
      .select("thread_id, item_kind, created_at")
      .eq("removed", false);
    const stats = new Map<string, { notes: number; tasks: number; last: string | null }>();
    for (const it of (items ?? []) as { thread_id: string; item_kind: ThreadItemKind; created_at: string }[]) {
      const s = stats.get(it.thread_id) ?? { notes: 0, tasks: 0, last: null };
      if (isTask(it.item_kind)) s.tasks += 1;
      else s.notes += 1;
      if (!s.last || it.created_at > s.last) s.last = it.created_at;
      stats.set(it.thread_id, s);
    }

    const threads = ((data ?? []) as { id: string; title: string; description: string | null; created_at: string }[]).map(
      (t) => {
        const s = stats.get(t.id);
        return {
          ...t,
          noteCount: s?.notes ?? 0,
          taskCount: s?.tasks ?? 0,
          lastAddedAt: s?.last ?? null,
        };
      },
    );
    // Most recently fed first.
    threads.sort((a, b) => ((a.lastAddedAt ?? a.created_at) < (b.lastAddedAt ?? b.created_at) ? 1 : -1));
    return { threads, missing: false };
  } catch {
    return { threads: [], missing: false };
  }
}

export interface ThreadPage {
  thread: Thread;
  notes: ThreadNote[]; // thoughts + ideas, newest first
  tasks: ThreadNote[]; // newest first
  origin: ThreadNote | null; // the earliest note: where it began
  itemCount: number; // notes + tasks, for "N new since the read"
}

export async function getThreadPage(id: string): Promise<ThreadPage | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data: thread, error } = await supabase
      .from("threads")
      .select("id, title, description, read, read_at, read_item_count, created_at")
      .eq("id", id)
      .maybeSingle();
    if (error || !thread) return null;

    const { data: items } = await supabase
      .from("thread_items")
      .select("item_kind, item_id")
      .eq("thread_id", id)
      .eq("removed", false);
    const refs = ((items ?? []) as { item_kind: ThreadItemKind; item_id: string }[]).map((i) => ({
      kind: i.item_kind,
      id: i.item_id,
    }));
    const all = await loadNotes(supabase, { refs });
    const notes = all.filter((n) => !isTask(n.kind));
    const tasks = all.filter((n) => isTask(n.kind));
    const origin = all.length ? all[all.length - 1] : null;
    return { thread: thread as Thread, notes, tasks, origin, itemCount: all.length };
  } catch {
    return null;
  }
}

// The one subject Pebble is currently asking about, if any.
export async function getPendingSuggestion(): Promise<ThreadSuggestion | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("thread_suggestions")
      .select("id, title, description, items, note_count, first_at")
      .eq("status", "pending")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const s = data as {
      id: string;
      title: string;
      description: string | null;
      items: ItemRef[];
      note_count: number;
      first_at: string | null;
    };
    const refs = Array.isArray(s.items) ? s.items : [];
    const notes = await loadNotes(supabase, { refs });
    const words = notes.filter((n) => !isTask(n.kind));
    return {
      id: s.id,
      title: s.title,
      description: s.description,
      note_count: notes.length || s.note_count,
      first_at: notes.length ? notes[notes.length - 1].captured_at : s.first_at,
      kinds: {
        thoughts: notes.filter((n) => n.kind === "thought").length,
        ideas: notes.filter((n) => n.kind === "idea").length,
        tasks: notes.filter((n) => isTask(n.kind)).length,
      },
      previews: (words.length ? words : notes).slice(0, 2).map((n) => n.text),
    };
  } catch {
    return null;
  }
}
