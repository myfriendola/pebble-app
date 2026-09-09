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
