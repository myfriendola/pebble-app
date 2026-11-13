// Words Pebble should know: names the ring's transcription keeps mishearing
// (a project called "Neimo" arriving as "Nemo"). Each new note is corrected as
// it lands, past notes can be fixed in one go, and the names help Pebble
// notice threads.
//
// Corrections are plain whole-word replacements, so they're predictable: the
// same input always gives the same note, and nothing else is touched.

import type { SupabaseClient } from "@supabase/supabase-js";
import { semanticEnabled } from "./embeddings";

type Db = SupabaseClient;

export interface Word {
  id: string;
  word: string;
  heard_as: string[];
}

export async function loadVocabulary(supabase: Db): Promise<{ words: Word[]; missing: boolean }> {
  try {
    const { data, error } = await supabase
      .from("vocabulary")
      .select("id, word, heard_as")
      .order("created_at", { ascending: true });
    if (error) return { words: [], missing: true };
    return { words: (data ?? []) as Word[], missing: false };
  } catch {
    return { words: [], missing: true };
  }
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A variant as a whole word (or phrase): "Nemo" matches "Nemo" and "nemo's",
// never "anemone". Spaces inside a phrase match any run of spaces.
function variantPattern(variant: string): RegExp {
  const body = escape(variant.trim()).replace(/\s+/g, "\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, "giu");
}

export function cleanVariants(word: string, heardAs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of heardAs) {
    const v = raw.trim().replace(/\s+/g, " ");
    if (!v || v === word.trim()) continue; // a different capitalisation is still a fix
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out.slice(0, 12);
}

export function applyVocabulary(text: string, words: Word[]): string {
  let out = text;
  for (const w of words) {
    for (const v of cleanVariants(w.word, w.heard_as)) {
      out = out.replace(variantPattern(v), w.word);
    }
  }
  return out;
}

// Where words live in past notes.
const FIELDS: { table: string; columns: string[] }[] = [
  { table: "captures", columns: ["transcript"] },
  { table: "thoughts", columns: ["text"] },
  { table: "ideas", columns: ["text"] },
  { table: "work_tasks", columns: ["action", "source_quote"] },
  { table: "life_tasks", columns: ["action", "source_quote"] },
];

type Change = { table: string; id: string; patch: Record<string, string> };

// Past notes a word would correct (captures aren't counted: they're the raw
// copies behind the notes, and are fixed alongside them).
async function pastChanges(supabase: Db, word: Word): Promise<Change[]> {
  const variants = cleanVariants(word.word, word.heard_as);
  if (variants.length === 0) return [];
  const changes = new Map<string, Change>();
  for (const { table, columns } of FIELDS) {
    for (const column of columns) {
      for (const v of variants) {
        const { data } = await supabase
          .from(table)
          .select(`id, ${columns.join(", ")}`)
          .ilike(column, `%${v.replace(/[%_]/g, "")}%`)
          .limit(1000);
        for (const row of (data ?? []) as unknown as Record<string, string | null>[]) {
          const key = `${table}:${row.id}`;
          const change = changes.get(key) ?? { table, id: String(row.id), patch: {} };
          for (const c of columns) {
            const before = change.patch[c] ?? row[c];
            if (typeof before !== "string") continue;
            const after = applyVocabulary(before, [word]);
            if (after !== before) change.patch[c] = after;
          }
          if (Object.keys(change.patch).length > 0) changes.set(key, change);
        }
      }
    }
  }
  return Array.from(changes.values());
}

export async function countPastNotes(supabase: Db, word: Word): Promise<number> {
  try {
    return (await pastChanges(supabase, word)).filter((c) => c.table !== "captures").length;
  } catch {
    return 0;
  }
}

export async function fixPastNotes(supabase: Db, word: Word): Promise<number> {
  const changes = await pastChanges(supabase, word);
  for (const c of changes) {
    await supabase.from(c.table).update(c.patch).eq("id", c.id);
    // Corrected text means a stale search embedding; let the nightly job redo it.
    if (semanticEnabled() && (c.table === "thoughts" || c.table === "ideas")) {
      try {
        await supabase.from(c.table).update({ embedding: null }).eq("id", c.id);
      } catch {
        /* no vector column */
      }
    }
  }
  return changes.filter((c) => c.table !== "captures").length;
}
