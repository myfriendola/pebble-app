"use server";

// Server actions for Threads: answering Pebble's question, gathering and
// reading a thread, and the small edits (remove a note, rename, delete).

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import {
  acceptSuggestion,
  gatherIntoThread,
  setSuggestionStatus,
  writeThreadRead,
} from "@/lib/threadWork";
import type { ThreadItemKind } from "@/lib/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS: ThreadItemKind[] = ["thought", "idea", "work_task", "life_task"];

function refresh(threadId?: string) {
  revalidatePath("/");
  revalidatePath("/threads");
  if (threadId) revalidatePath(`/threads/${threadId}`);
}

// "Make a thread" → the new thread's id (the card then opens it).
export async function makeThread(suggestionId: string): Promise<{ id: string | null }> {
  const supabase = getSupabase();
  if (!supabase || !UUID_RE.test(suggestionId)) return { id: null };
  const id = await acceptSuggestion(supabase, suggestionId);
  refresh(id ?? undefined);
  return { id };
}

// "Not yet" (ask again after a few more notes) or "Not a thing" (never ask).
export async function answerSuggestion(
  suggestionId: string,
  answer: "snoozed" | "declined",
): Promise<{ ok: boolean }> {
  const supabase = getSupabase();
  if (!supabase || !UUID_RE.test(suggestionId)) return { ok: false };
  await setSuggestionStatus(supabase, suggestionId, answer);
  refresh();
  return { ok: true };
}

// Look back through older notes for ones that belong.
export async function gatherThread(threadId: string): Promise<{ added: number }> {
  const supabase = getSupabase();
  if (!supabase || !UUID_RE.test(threadId)) return { added: 0 };
  const added = await gatherIntoThread(supabase, threadId);
  refresh(threadId);
  return { added };
}

// (Re)write Pebble's read.
export async function readThread(threadId: string): Promise<{ ok: boolean }> {
  const supabase = getSupabase();
  if (!supabase || !UUID_RE.test(threadId)) return { ok: false };
  const ok = await writeThreadRead(supabase, threadId);
  refresh(threadId);
  return { ok };
}

// "Not about this": the note leaves the thread (and is never re-gathered),
// but stays in Thoughts / Ideas / Tasks.
export async function removeFromThread(
  threadId: string,
  kind: ThreadItemKind,
  itemId: string,
): Promise<{ ok: boolean }> {
  const supabase = getSupabase();
  if (!supabase || !UUID_RE.test(threadId) || !UUID_RE.test(itemId) || !KINDS.includes(kind)) {
    return { ok: false };
  }
  await supabase
    .from("thread_items")
    .update({ removed: true })
    .eq("thread_id", threadId)
    .eq("item_kind", kind)
    .eq("item_id", itemId);
  refresh(threadId);
  return { ok: true };
}

export async function renameThread(
  threadId: string,
  title: string,
  description: string,
): Promise<{ ok: boolean }> {
  const supabase = getSupabase();
  const t = title.trim().slice(0, 80);
  if (!supabase || !UUID_RE.test(threadId) || !t) return { ok: false };
  await supabase
    .from("threads")
    .update({ title: t, description: description.trim().slice(0, 240) || null })
    .eq("id", threadId);
  refresh(threadId);
  return { ok: true };
}

// The thread goes; every note in it stays where it lives.
export async function deleteThread(threadId: string): Promise<{ ok: boolean }> {
  const supabase = getSupabase();
  if (!supabase || !UUID_RE.test(threadId)) return { ok: false };
  await supabase.from("threads").delete().eq("id", threadId);
  refresh();
  return { ok: true };
}
