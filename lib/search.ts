// Recall across everything you've captured. Text search (ilike) always works
// with no setup; when semantic search is enabled it leads with meaning-based
// matches and folds in any exact keyword hits the vectors missed.

import { getSupabase } from "./supabase";
import { embed, semanticEnabled } from "./embeddings";

export interface SearchHit {
  kind: "thought" | "idea" | "task";
  id: string;
  text: string; // thought/idea text, or a task's action
  themes?: string[];
  domain?: string | null;
  due?: string | null;
  status?: string;
  captured_at: string;
  similarity?: number;
}

const SIMILARITY_FLOOR = 0.2; // drop weak semantic matches so results stay relevant

function escapeLike(q: string): string {
  return q.replace(/[%_\\]/g, "\\$&");
}

// Plain keyword search across thoughts, ideas, and both task tables.
export async function textSearch(q: string, limit = 24): Promise<SearchHit[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const like = `%${escapeLike(q)}%`;
  try {
    const [th, id, wt, lt] = await Promise.all([
      supabase
        .from("thoughts")
        .select("id, text, themes, captured_at")
        .ilike("text", like)
        .order("captured_at", { ascending: false })
        .limit(limit),
      supabase
        .from("ideas")
        .select("id, text, themes, domain, captured_at")
        .ilike("text", like)
        .order("captured_at", { ascending: false })
        .limit(limit),
      supabase
        .from("work_tasks")
        .select("id, action, due, status, captured_at")
        .ilike("action", like)
        .order("captured_at", { ascending: false })
        .limit(limit),
      supabase
        .from("life_tasks")
        .select("id, action, due, status, captured_at")
        .ilike("action", like)
        .order("captured_at", { ascending: false })
        .limit(limit),
    ]);

    const hits: SearchHit[] = [];
    for (const r of (th.data ?? []) as Record<string, unknown>[]) {
      hits.push({
        kind: "thought",
        id: String(r.id),
        text: String(r.text ?? ""),
        themes: (r.themes as string[]) ?? [],
        captured_at: String(r.captured_at ?? ""),
      });
    }
    for (const r of (id.data ?? []) as Record<string, unknown>[]) {
      hits.push({
        kind: "idea",
        id: String(r.id),
        text: String(r.text ?? ""),
        themes: (r.themes as string[]) ?? [],
        domain: (r.domain as string) ?? null,
        captured_at: String(r.captured_at ?? ""),
      });
    }
    for (const r of [...((wt.data ?? []) as Record<string, unknown>[]), ...((lt.data ?? []) as Record<string, unknown>[])]) {
      hits.push({
        kind: "task",
        id: String(r.id),
        text: String(r.action ?? ""),
        due: (r.due as string) ?? null,
        status: String(r.status ?? "open"),
        captured_at: String(r.captured_at ?? ""),
      });
    }
    return hits.sort((a, b) => (a.captured_at < b.captured_at ? 1 : -1));
  } catch {
    return [];
  }
}

export interface SearchResult {
  semantic: boolean;
  hits: SearchHit[];
}

export async function search(rawQuery: string): Promise<SearchResult> {
  const q = rawQuery.trim();
  if (!q) return { semantic: false, hits: [] };

  const textHits = await textSearch(q);
  if (!semanticEnabled()) return { semantic: false, hits: textHits };

  const vec = await embed(q);
  const supabase = getSupabase();
  if (!vec || !supabase) return { semantic: false, hits: textHits };

  try {
    const { data, error } = await supabase.rpc("match_notes", {
      query_embedding: vec,
      match_count: 30,
    });
    if (error || !data) return { semantic: false, hits: textHits };

    const semHits: SearchHit[] = (data as Record<string, unknown>[])
      .map((r) => ({
        kind: (r.kind === "idea" ? "idea" : "thought") as "thought" | "idea",
        id: String(r.id),
        text: String(r.text ?? ""),
        themes: (r.themes as string[]) ?? [],
        domain: (r.domain as string) ?? null,
        captured_at: String(r.captured_at ?? ""),
        similarity: typeof r.similarity === "number" ? r.similarity : 0,
      }))
      .filter((h) => (h.similarity ?? 0) >= SIMILARITY_FLOOR);

    // Keep any exact keyword hits the vectors ranked out (tasks always come from
    // text search, since they aren't embedded).
    const seen = new Set(semHits.map((h) => `${h.kind}:${h.id}`));
    const extra = textHits.filter((h) => !seen.has(`${h.kind}:${h.id}`));

    return { semantic: true, hits: [...semHits, ...extra] };
  } catch {
    return { semantic: false, hits: textHits };
  }
}
