"use server";

// Words Pebble should know: add a name and how it gets misheard, remove one,
// or correct past notes in one go.

import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import { cleanVariants, countPastNotes, fixPastNotes, loadVocabulary } from "@/lib/vocabulary";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refreshAll() {
  for (const p of ["/", "/thoughts", "/ideas", "/tasks", "/threads", "/settings"]) revalidatePath(p);
}

export async function addWord(
  word: string,
  heardAs: string,
): Promise<{ ok: boolean; id?: string; pastCount?: number; error?: string }> {
  const supabase = getSupabase();
  const w = word.trim().replace(/\s+/g, " ").slice(0, 60);
  const variants = cleanVariants(w, heardAs.split(","));
  if (!supabase || !w) return { ok: false, error: "Add the word as you spell it." };
  if (variants.length === 0) return { ok: false, error: "Add how it gets misheard, e.g. Nemo." };

  const { data, error } = await supabase
    .from("vocabulary")
    .upsert({ word: w, heard_as: variants }, { onConflict: "word" })
    .select("id, word, heard_as")
    .single();
  if (error || !data) return { ok: false, error: "Couldn't save that just now." };
  const pastCount = await countPastNotes(supabase, data as { id: string; word: string; heard_as: string[] });
  revalidatePath("/settings");
  return { ok: true, id: (data as { id: string }).id, pastCount };
}

export async function removeWord(id: string): Promise<{ ok: boolean }> {
  const supabase = getSupabase();
  if (!supabase || !UUID_RE.test(id)) return { ok: false };
  await supabase.from("vocabulary").delete().eq("id", id);
  revalidatePath("/settings");
  return { ok: true };
}

export async function fixWordInPastNotes(id: string): Promise<{ fixed: number }> {
  const supabase = getSupabase();
  if (!supabase || !UUID_RE.test(id)) return { fixed: 0 };
  const word = (await loadVocabulary(supabase)).words.find((w) => w.id === id);
  if (!word) return { fixed: 0 };
  const fixed = await fixPastNotes(supabase, word);
  refreshAll();
  return { fixed };
}
