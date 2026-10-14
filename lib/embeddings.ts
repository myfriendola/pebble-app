// Semantic search support. Optional: only active when SEARCH_EMBEDDINGS is set
// (and the pgvector migration has been run). When off, everything degrades to
// plain text search and nothing here runs — so a deployment without the vector
// column is never at risk.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getOpenAI } from "./openai";

const EMBED_MODEL = "text-embedding-3-small"; // 1536 dimensions

export function semanticEnabled(): boolean {
  return (
    Boolean((process.env.SEARCH_EMBEDDINGS ?? "").trim()) &&
    Boolean((process.env.OPENAI_API_KEY ?? "").trim())
  );
}

// Turn a piece of text into an embedding vector, or null on any failure.
export async function embed(text: string): Promise<number[] | null> {
  const client = getOpenAI();
  if (!client) return null;
  const input = text.slice(0, 8000).trim();
  if (!input) return null;
  try {
    const res = await client.embeddings.create({ model: EMBED_MODEL, input });
    return res.data[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

// Best-effort: attach an embedding to a freshly-filed thought or idea. Silently
// no-ops when semantic search is off or the vector column isn't set up, so it
// can never break the capture that just succeeded.
export async function embedRow(
  supabase: SupabaseClient,
  table: "thoughts" | "ideas",
  id: string,
  text: string,
): Promise<void> {
  if (!semanticEnabled()) return;
  const vec = await embed(text);
  if (!vec) return;
  try {
    await supabase.from(table).update({ embedding: vec }).eq("id", id);
  } catch {
    /* vector column not present — ignore */
  }
}

// Fill in embeddings for a batch of thoughts/ideas that don't have one yet, so
// older notes (captured before semantic search was turned on) become findable.
// Runs from the nightly sweep; bounded per run to keep it cheap.
export async function backfillEmbeddings(
  supabase: SupabaseClient,
  perTable = 40,
): Promise<number> {
  if (!semanticEnabled()) return 0;
  let done = 0;
  for (const table of ["thoughts", "ideas"] as const) {
    try {
      const { data } = await supabase
        .from(table)
        .select("id, text")
        .is("embedding", null)
        .limit(perTable);
      for (const row of (data ?? []) as { id: string; text: string }[]) {
        const vec = await embed(row.text);
        if (!vec) continue;
        await supabase.from(table).update({ embedding: vec }).eq("id", row.id);
        done += 1;
      }
    } catch {
      /* vector column not present — ignore */
    }
  }
  return done;
}
