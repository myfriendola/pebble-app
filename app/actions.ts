"use server";

// Server action behind the dev "Process now" button on Today. Runs the same
// pipeline as /api/cron/nightly, but server-side — so CRON_SECRET never leaves
// the server and nothing is exposed to the browser. Then refreshes the screens.

import { revalidatePath } from "next/cache";
import { runNightly } from "@/lib/processing";
import type { PipelineReport } from "@/lib/processing";
import { getSupabase } from "@/lib/supabase";
import type { Domain } from "@/lib/types";

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
