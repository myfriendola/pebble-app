// Threads: the AI work. Noticing a subject worth a thread (nightly), turning a
// suggestion into a thread, gathering the notes that belong, and writing
// Pebble's read. All best-effort: failures leave things as they were.

import type { SupabaseClient } from "@supabase/supabase-js";
import { chatJson } from "./openai";
import { hasOpenAI } from "./env";
import { appTodayStr } from "./time";
import {
  NOTICE_SYSTEM,
  buildNoticeUser,
  GATHER_SYSTEM,
  buildGatherUser,
  READ_SYSTEM,
  buildReadUser,
  type PromptNote,
} from "./prompts/threads";
import { addThreadItems, isTask, loadNotes, refKey } from "./threads";
import type { ItemRef, ReadPoint, ThreadNote, ThreadRead } from "./types";

type Db = SupabaseClient;

const TZ = (process.env.APP_TIMEZONE || "America/New_York").trim();
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: TZ });

// Number notes for a prompt; the model cites numbers, we map them back.
function numbered(notes: ThreadNote[]): { prompt: PromptNote[]; byNumber: Map<number, ThreadNote> } {
  const byNumber = new Map<number, ThreadNote>();
  const prompt = notes.map((n, i) => {
    byNumber.set(i + 1, n);
    return {
      n: i + 1,
      date: shortDate(n.captured_at),
      kind: isTask(n.kind) ? ("task" as const) : (n.kind as "thought" | "idea"),
      text: n.text.slice(0, 600),
      quote: n.quote,
      done: n.status === "done",
    };
  });
  return { prompt, byNumber };
}

function refsFrom(numbers: unknown, byNumber: Map<number, ThreadNote>): ItemRef[] {
  if (!Array.isArray(numbers)) return [];
  const seen = new Set<string>();
  const out: ItemRef[] = [];
  for (const raw of numbers) {
    const note = byNumber.get(Number(raw));
    if (!note) continue;
    const ref = { kind: note.kind, id: note.id };
    if (seen.has(refKey(ref))) continue;
    seen.add(refKey(ref));
    out.push(ref);
  }
  return out;
}

const normKey = (s: string) =>
  s
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// The bar for asking: a named thing after 3 notes; any other subject after 5
// notes spread over at least 3 different days. (All within the last 30 days.)
export function qualifies(named: boolean, notes: ThreadNote[]): boolean {
  if (named) return notes.length >= 3;
  const days = new Set(notes.map((n) => appTodayStr(new Date(n.captured_at))));
  return notes.length >= 5 && days.size >= 3;
}

// ── Noticing (nightly) ──────────────────────────────────────────────────────
// Looks over the last 30 days for one subject worth asking about. Only one
// question is ever open at a time; "not a thing" is never asked again, and
// "not yet" waits until three more notes have gathered.
export async function noticeThreads(supabase: Db): Promise<string | null> {
  if (!hasOpenAI) return null;
  try {
    const open = await supabase.from("thread_suggestions").select("id").eq("status", "pending").limit(1);
    if (open.error || (open.data ?? []).length > 0) return null; // table missing, or already asking

    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const recent = (await loadNotes(supabase, { since, limit: 400 })).reverse(); // oldest first
    if (recent.length < 3) return null;

    const [threadsRes, pastRes, itemsRes] = await Promise.all([
      supabase.from("threads").select("id, title"),
      supabase.from("thread_suggestions").select("id, subject_key, title, status, snooze_until_count"),
      supabase.from("thread_items").select("thread_id, item_kind, item_id").eq("removed", false),
    ]);
    const threads = (threadsRes.data ?? []) as { id: string; title: string }[];
    const past = (pastRes.data ?? []) as {
      id: string;
      subject_key: string;
      title: string;
      status: string;
      snooze_until_count: number | null;
    }[];
    const inThread = new Map<string, Set<string>>(); // thread → item keys
    for (const it of (itemsRes.data ?? []) as { thread_id: string; item_kind: string; item_id: string }[]) {
      const set = inThread.get(it.thread_id) ?? new Set<string>();
      set.add(`${it.item_kind}:${it.item_id}`);
      inThread.set(it.thread_id, set);
    }

    const existing = [
      ...threads.map((t) => t.title),
      ...past.filter((p) => p.status === "accepted").map((p) => p.title),
    ];
    const declined = past.filter((p) => p.status === "declined").map((p) => p.title);

    const { prompt, byNumber } = numbered(recent);
    const parsed = await chatJson<{
      subjects?: { key?: string; title?: string; named?: boolean; description?: string; notes?: number[] }[];
    }>(NOTICE_SYSTEM, buildNoticeUser(prompt, existing, declined), {
      temperature: 0.2,
      timeoutMs: 40_000,
      maxRetries: 1,
    });

    const takenTitles = new Set(existing.map(normKey));
    for (const s of parsed?.subjects ?? []) {
      const title = (s.title ?? "").trim();
      if (!title) continue;
      const key = normKey(s.key || title);
      const refs = refsFrom(s.notes, byNumber);
      const notes = refs
        .map((r) => recent.find((n) => n.kind === r.kind && n.id === r.id))
        .filter((n): n is ThreadNote => Boolean(n));
      if (!qualifies(Boolean(s.named), notes)) continue;
      if (takenTitles.has(normKey(title))) continue;

      // Mostly already gathered by an existing thread under another name? Skip.
      const covered = Array.from(inThread.values()).some(
        (set) => refs.filter((r) => set.has(refKey(r))).length >= Math.ceil(refs.length * 0.6),
      );
      if (covered) continue;

      const prior = past.find((p) => p.subject_key === key || normKey(p.title) === normKey(title));
      if (prior && prior.status !== "snoozed") continue; // declined, accepted or already asked
      if (prior && refs.length < (prior.snooze_until_count ?? 0)) continue; // "not yet": wait

      const firstAt = notes.reduce((min, n) => (n.captured_at < min ? n.captured_at : min), notes[0].captured_at);
      const row = {
        subject_key: key,
        title,
        description: (s.description ?? "").trim() || null,
        items: refs,
        note_count: refs.length,
        first_at: firstAt,
        status: "pending",
        updated_at: new Date().toISOString(),
      };
      if (prior) await supabase.from("thread_suggestions").update(row).eq("id", prior.id);
      else await supabase.from("thread_suggestions").insert(row);
      return title;
    }
    return null;
  } catch (e) {
    console.error("noticeThreads failed:", e);
    return null;
  }
}

// ── Answering the question ──────────────────────────────────────────────────

export async function acceptSuggestion(supabase: Db, suggestionId: string): Promise<string | null> {
  const { data } = await supabase
    .from("thread_suggestions")
    .select("id, title, description, items, status, thread_id")
    .eq("id", suggestionId)
    .maybeSingle();
  if (!data) return null;
  const s = data as { id: string; title: string; description: string | null; items: ItemRef[]; status: string; thread_id: string | null };
  if (s.status === "accepted" && s.thread_id) return s.thread_id; // double tap

  const { data: thread, error } = await supabase
    .from("threads")
    .insert({ title: s.title, description: s.description })
    .select("id")
    .single();
  if (error || !thread) return null;
  const threadId = (thread as { id: string }).id;
  await addThreadItems(supabase, threadId, Array.isArray(s.items) ? s.items : []);
  await supabase
    .from("thread_suggestions")
    .update({ status: "accepted", thread_id: threadId, updated_at: new Date().toISOString() })
    .eq("id", s.id);
  return threadId;
}

export async function setSuggestionStatus(
  supabase: Db,
  suggestionId: string,
  status: "snoozed" | "declined",
): Promise<void> {
  const { data } = await supabase
    .from("thread_suggestions")
    .select("note_count")
    .eq("id", suggestionId)
    .maybeSingle();
  const count = (data as { note_count?: number } | null)?.note_count ?? 0;
  await supabase
    .from("thread_suggestions")
    .update({
      status,
      snooze_until_count: status === "snoozed" ? count + 3 : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", suggestionId);
}

// ── Gathering ───────────────────────────────────────────────────────────────
// Reads back through older notes (beyond the 30 days that prompted the
// question) for ones that belong. Notes you removed are never re-added.
export async function gatherIntoThread(supabase: Db, threadId: string): Promise<number> {
  if (!hasOpenAI) return 0;
  const { data: thread } = await supabase
    .from("threads")
    .select("id, title, description")
    .eq("id", threadId)
    .maybeSingle();
  if (!thread) return 0;
  const t = thread as { id: string; title: string; description: string | null };

  const { data: items } = await supabase
    .from("thread_items")
    .select("item_kind, item_id, removed")
    .eq("thread_id", threadId);
  const known = new Set(((items ?? []) as { item_kind: string; item_id: string }[]).map((i) => `${i.item_kind}:${i.item_id}`));
  const memberRefs = ((items ?? []) as { item_kind: ItemRef["kind"]; item_id: string; removed: boolean }[])
    .filter((i) => !i.removed)
    .map((i) => ({ kind: i.item_kind, id: i.item_id }));
  const examples = (await loadNotes(supabase, { refs: memberRefs.slice(0, 12) }))
    .slice(0, 5)
    .map((n) => n.text.slice(0, 160));

  const candidates = (await loadNotes(supabase, { limit: 500 })).filter((n) => !known.has(refKey(n)));
  if (candidates.length === 0) return 0;

  const batches: ThreadNote[][] = [];
  for (let i = 0; i < candidates.length; i += 100) batches.push(candidates.slice(i, i + 100));
  const found = await Promise.all(
    batches.map(async (batch) => {
      const { prompt, byNumber } = numbered(batch);
      try {
        const parsed = await chatJson<{ notes?: number[] }>(GATHER_SYSTEM, buildGatherUser(t, examples, prompt), {
          temperature: 0,
          timeoutMs: 40_000,
          maxRetries: 1,
        });
        return refsFrom(parsed?.notes, byNumber);
      } catch {
        return [];
      }
    }),
  );
  const refs = found.flat();
  await addThreadItems(supabase, threadId, refs);
  return refs.length;
}

// ── Pebble's read ───────────────────────────────────────────────────────────

const LIMITS = { recurring: 4, tensions: 3, shifts: 3, questions: 4, moves: 4 };

export async function writeThreadRead(supabase: Db, threadId: string): Promise<boolean> {
  if (!hasOpenAI) return false;
  const { data: thread } = await supabase
    .from("threads")
    .select("id, title, description")
    .eq("id", threadId)
    .maybeSingle();
  if (!thread) return false;
  const t = thread as { id: string; title: string; description: string | null };

  const { data: items } = await supabase
    .from("thread_items")
    .select("item_kind, item_id")
    .eq("thread_id", threadId)
    .eq("removed", false);
  const refs = ((items ?? []) as { item_kind: ItemRef["kind"]; item_id: string }[]).map((i) => ({
    kind: i.item_kind,
    id: i.item_id,
  }));
  const all = await loadNotes(supabase, { refs }); // newest first
  if (all.length === 0) return false;
  // The newest 150 plus the very first note, oldest first.
  const chosen = all.slice(0, 150);
  if (all.length > 150) chosen.push(all[all.length - 1]);
  chosen.reverse();

  const { prompt, byNumber } = numbered(chosen);
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = await chatJson<Record<string, unknown>>(READ_SYSTEM, buildReadUser(t, prompt), {
      temperature: 0.4,
      timeoutMs: 50_000,
      maxRetries: 1,
    });
  } catch (e) {
    console.error("thread read failed:", e);
    return false;
  }
  if (!parsed) return false;

  const points = (key: keyof typeof LIMITS): ReadPoint[] => {
    const list = Array.isArray(parsed?.[key]) ? (parsed?.[key] as Record<string, unknown>[]) : [];
    return list
      .filter((p) => p && typeof p.text === "string" && (p.text as string).trim())
      .slice(0, LIMITS[key])
      .map((p) => ({
        text: (p.text as string).trim(),
        ...(typeof p.why === "string" && p.why.trim() ? { why: p.why.trim() } : {}),
        cites: refsFrom(p.notes, byNumber),
      }));
  };
  const read: ThreadRead = {
    gist: typeof parsed.gist === "string" ? parsed.gist.trim() : "",
    recurring: points("recurring"),
    tensions: points("tensions"),
    shifts: points("shifts"),
    questions: points("questions"),
    moves: points("moves"),
  };
  if (!read.gist && read.recurring.length === 0) return false;

  await supabase
    .from("threads")
    .update({ read, read_at: new Date().toISOString(), read_item_count: all.length })
    .eq("id", threadId);
  return true;
}

