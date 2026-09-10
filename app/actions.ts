"use server";

// Server action behind the dev "Process now" button on Today. Runs the same
// pipeline as /api/cron/nightly, but server-side — so CRON_SECRET never leaves
// the server and nothing is exposed to the browser. Then refreshes the screens.

import { revalidatePath } from "next/cache";
import { runNightly, analyzeText } from "@/lib/processing";
import type { PipelineReport } from "@/lib/processing";
import { getSupabase } from "@/lib/supabase";
import type { Domain, SortResult } from "@/lib/types";

export async function processNow(): Promise<PipelineReport> {
  const report = await runNightly();
  revalidatePath("/");
  revalidatePath("/thoughts");
  revalidatePath("/tasks");
  revalidatePath("/reflections");
  return report;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ReviewDecision = "task" | "thought" | "idea" | "dismiss";

// Resolve a review-queue item: file it into the chosen table (using the
// low-confidence best guess to prefill), or dismiss it. Either way the item
// leaves the queue. No-op for sample data (non-uuid ids / no Supabase); the UI
// removes it optimistically regardless.
export async function resolveReview(
  id: string,
  decision: ReviewDecision,
): Promise<{ ok: boolean }> {
  const supabase = getSupabase();
  if (!supabase || !UUID_RE.test(id)) return { ok: false };

  const { data } = await supabase
    .from("review_queue")
    .select("id, best_guess, captures(transcript)")
    .eq("id", id)
    .limit(1)
    .maybeSingle();
  if (!data) return { ok: false };

  const g = (data.best_guess ?? {}) as {
    action?: string;
    source_quote?: string;
    due?: string | null;
    priority?: string | null;
    themes?: string[];
    domain?: string;
    note?: string;
  };
  const transcript =
    (data as { captures?: { transcript?: string } | null }).captures?.transcript ?? g.note ?? "";

  if (decision !== "dismiss" && transcript) {
    const themes = Array.isArray(g.themes) ? g.themes.slice(0, 3) : [];
    const domain = g.domain === "work" || g.domain === "life" ? g.domain : null;

    if (decision === "task") {
      const table = domain === "work" ? "work_tasks" : "life_tasks";
      await supabase.from(table).insert({
        action: g.action ?? transcript,
        source_quote: g.source_quote ?? transcript,
        due: g.due ?? null,
        priority: g.priority ?? null,
        status: "open",
      });
    } else if (decision === "idea") {
      await supabase.from("ideas").insert({ text: transcript, themes, domain });
    } else {
      await supabase.from("thoughts").insert({ text: transcript, themes });
    }
  }

  await supabase.from("review_queue").delete().eq("id", id);

  revalidatePath("/");
  revalidatePath("/thoughts");
  revalidatePath("/ideas");
  revalidatePath("/tasks");
  return { ok: true };
}

// Mark a task done / open. Persists when it's a real row (uuid + Supabase);
// otherwise it's a no-op and the UI keeps its optimistic state (sample data).
export async function toggleTaskDone(
  domain: Domain,
  id: string,
  done: boolean,
): Promise<{ ok: boolean }> {
  const supabase = getSupabase();
  if (!supabase || !UUID_RE.test(id)) return { ok: false };
  const table = domain === "work" ? "work_tasks" : "life_tasks";
  await supabase.from(table).update({ status: done ? "done" : "open" }).eq("id", id);
  revalidatePath("/tasks");
  revalidatePath("/");
  return { ok: true };
}

// ── Editing an item's text, with LLM re-analysis ──────────────────────────────

export type ItemKind = "thought" | "idea" | "work_task" | "life_task";

const TABLE: Record<ItemKind, string> = {
  thought: "thoughts",
  idea: "ideas",
  work_task: "work_tasks",
  life_task: "life_tasks",
};

const themesOf = (r: SortResult) => (Array.isArray(r.themes) ? r.themes.slice(0, 3) : []);
const domainOf = (r: SortResult): Domain | null =>
  r.domain === "work" || r.domain === "life" ? r.domain : null;

function targetKindOf(r: SortResult): ItemKind {
  if (r.type === "task") return r.domain === "work" ? "work_task" : "life_task";
  if (r.type === "idea") return "idea";
  return "thought";
}

function labelOf(kind: ItemKind, r: SortResult): string {
  if (kind === "work_task") return "Task · Work";
  if (kind === "life_task") return "Task · Life";
  if (kind === "idea") return domainOf(r) ? `Idea · ${domainOf(r)}` : "Idea";
  return "Thought";
}

function revalidateItems() {
  revalidatePath("/");
  revalidatePath("/thoughts");
  revalidatePath("/ideas");
  revalidatePath("/tasks");
}

type Supa = NonNullable<ReturnType<typeof getSupabase>>;

// Store just the corrected wording on the existing row.
async function saveText(supabase: Supa, kind: ItemKind, id: string, text: string) {
  if (kind === "thought") await supabase.from("thoughts").update({ text }).eq("id", id);
  else if (kind === "idea") await supabase.from("ideas").update({ text }).eq("id", id);
  else await supabase.from(TABLE[kind]).update({ source_quote: text }).eq("id", id);
}

// Update the derived fields in place (same category after re-analysis).
async function applyFields(supabase: Supa, kind: ItemKind, id: string, text: string, r: SortResult) {
  if (kind === "thought") {
    await supabase.from("thoughts").update({ themes: themesOf(r) }).eq("id", id);
  } else if (kind === "idea") {
    await supabase.from("ideas").update({ themes: themesOf(r), domain: domainOf(r) }).eq("id", id);
  } else {
    await supabase
      .from(TABLE[kind])
      .update({ action: r.action ?? text, due: r.due ?? null, priority: r.priority ?? null })
      .eq("id", id);
  }
}

async function insertItem(supabase: Supa, kind: ItemKind, text: string, r: SortResult, capturedAt: string) {
  if (kind === "thought") {
    await supabase.from("thoughts").insert({ text, themes: themesOf(r), captured_at: capturedAt });
  } else if (kind === "idea") {
    await supabase
      .from("ideas")
      .insert({ text, themes: themesOf(r), domain: domainOf(r), captured_at: capturedAt });
  } else {
    await supabase.from(TABLE[kind]).insert({
      action: r.action ?? text,
      source_quote: text,
      due: r.due ?? null,
      priority: r.priority ?? null,
      status: "open",
      captured_at: capturedAt,
    });
  }
}

export type ReanalyzeResult =
  | { status: "noop" }
  | { status: "updated" }
  | { status: "suggest"; target: ItemKind; label: string; result: SortResult };

// Save the edited text, then re-run the sort. If the category is unchanged, the
// derived fields are refreshed in place. If it now reads as a different
// category, the corrected text is still saved but the move is only *suggested*
// (the caller confirms via moveItem) — so nothing silently jumps screens.
export async function saveAndReanalyze(
  kind: ItemKind,
  id: string,
  rawText: string,
): Promise<ReanalyzeResult> {
  const supabase = getSupabase();
  const text = rawText.trim();
  if (!supabase || !UUID_RE.test(id) || !text) return { status: "noop" };

  await saveText(supabase, kind, id, text);

  const result = await analyzeText(text);
  if (!result) {
    revalidateItems();
    return { status: "updated" };
  }

  const target = targetKindOf(result);
  if (target === kind) {
    await applyFields(supabase, kind, id, text, result);
    revalidateItems();
    return { status: "updated" };
  }

  revalidateItems();
  return { status: "suggest", target, label: labelOf(target, result), result };
}

// Confirm a suggested move: recreate the item in the target table (carrying the
// original capture time) and remove the old one.
export async function moveItem(
  fromKind: ItemKind,
  id: string,
  toKind: ItemKind,
  result: SortResult,
  rawText: string,
): Promise<{ ok: boolean }> {
  const supabase = getSupabase();
  const text = rawText.trim();
  if (!supabase || !UUID_RE.test(id) || !text) return { ok: false };

  const { data: row } = await supabase
    .from(TABLE[fromKind])
    .select("captured_at")
    .eq("id", id)
    .maybeSingle();
  const capturedAt = (row as { captured_at?: string } | null)?.captured_at ?? new Date().toISOString();

  await insertItem(supabase, toKind, text, result, capturedAt);
  await supabase.from(TABLE[fromKind]).delete().eq("id", id);
  revalidateItems();
  return { ok: true };
}
