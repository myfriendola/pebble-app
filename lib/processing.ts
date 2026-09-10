// The end-of-day (and weekly / monthly) pipeline. Shared by the cron routes
// and the dev "Process now" button. Requires both Supabase and OpenAI to be
// configured; returns a small report either way.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import { chatJson } from "./openai";
import { hasOpenAI } from "./env";
import { SORT_SYSTEM, buildSortUser } from "./prompts/sort";
import { SUMMARIZE_SYSTEM, buildSummarizeUser } from "./prompts/summarize";
import type { DigestKind, SortResult, SummaryResult } from "./types";

const CONFIDENCE_FLOOR = 0.6;

export interface PipelineReport {
  ok: boolean;
  reason?: string;
  processed?: number;
  committed?: number;
  review?: number;
  digest?: DigestKind | null;
}

// Coerce the sort model's output into an array of note objects, whatever the
// exact JSON shape (array, {notes:[...]}, or a single object).
function normalizeSortArray(parsed: unknown): SortResult[] {
  if (Array.isArray(parsed)) return parsed as SortResult[];
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if ("type" in obj) return [obj as unknown as SortResult];
    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) return value as SortResult[];
    }
  }
  return [];
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function loadThoughtsSince(supabase: SupabaseClient, sinceIso: string) {
  const { data } = await supabase
    .from("thoughts")
    .select("text, themes, captured_at")
    .gte("captured_at", sinceIso)
    .order("captured_at", { ascending: true });
  return (data ?? []) as { text: string; themes: string[]; captured_at: string }[];
}

async function loadTasksSince(supabase: SupabaseClient, sinceIso: string) {
  const [w, l] = await Promise.all([
    supabase.from("work_tasks").select("action, source_quote").gte("captured_at", sinceIso),
    supabase.from("life_tasks").select("action, source_quote").gte("captured_at", sinceIso),
  ]);
  return [
    ...(w.data ?? []).map((t) => ({ ...t, domain: "work" })),
    ...(l.data ?? []).map((t) => ({ ...t, domain: "life" })),
  ] as { action: string; source_quote: string | null; domain: string }[];
}

async function loadIdeasSince(supabase: SupabaseClient, sinceIso: string) {
  const { data } = await supabase
    .from("ideas")
    .select("text, themes, domain")
    .gte("captured_at", sinceIso)
    .order("captured_at", { ascending: true });
  return (data ?? []) as { text: string; themes: string[]; domain: string | null }[];
}

// Upsert a digest for a given kind + period_date (so re-runs update, not
// duplicate).
async function writeDigest(
  supabase: SupabaseClient,
  kind: DigestKind,
  periodDate: string,
  summary: SummaryResult,
  needsReviewCount: number,
) {
  const row = {
    kind,
    period_date: periodDate,
    narrative: summary.narrative ?? "",
    questions: Array.isArray(summary.questions) ? summary.questions : [],
    themes: Array.isArray(summary.themes) ? summary.themes : [],
    needs_review_count: needsReviewCount,
  };

  const { data: existing } = await supabase
    .from("digests")
    .select("id")
    .eq("kind", kind)
    .eq("period_date", periodDate)
    .limit(1);

  if (existing && existing.length > 0) {
    await supabase.from("digests").update(row).eq("id", existing[0].id);
  } else {
    await supabase.from("digests").insert(row);
  }
}

// ── Nightly: sort unprocessed captures, then write the daily reflection. ──
export async function runNightly(): Promise<PipelineReport> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: "Supabase is not configured" };
  if (!hasOpenAI) return { ok: false, reason: "OpenAI is not configured" };

  const { data: captures } = await supabase
    .from("captures")
    .select("id, transcript, captured_at")
    .eq("processed", false)
    .order("captured_at", { ascending: true });

  let committed = 0;
  let review = 0;
  const pending = captures ?? [];

  for (const capture of pending) {
    let items: SortResult[] = [];
    try {
      const parsed = await chatJson<unknown>(
        SORT_SYSTEM,
        buildSortUser([capture.transcript]),
        { temperature: 0.2 },
      );
      items = normalizeSortArray(parsed);
    } catch {
      // Leave this capture unprocessed so the next run can retry it.
      continue;
    }

    for (const item of items) {
      const confidence = typeof item.confidence === "number" ? item.confidence : 0;

      if (confidence < CONFIDENCE_FLOOR) {
        await supabase.from("review_queue").insert({
          capture_id: capture.id,
          best_guess: item as unknown as Record<string, unknown>,
        });
        review += 1;
        continue;
      }

      if (item.type === "task") {
        const table = item.domain === "work" ? "work_tasks" : "life_tasks";
        await supabase.from(table).insert({
          action: item.action ?? capture.transcript,
          source_quote: item.source_quote ?? capture.transcript,
          due: item.due ?? null,
          priority: item.priority ?? null,
          status: "open",
          captured_at: capture.captured_at,
        });
        committed += 1;
      } else if (item.type === "idea") {
        await supabase.from("ideas").insert({
          text: capture.transcript,
          themes: Array.isArray(item.themes) ? item.themes.slice(0, 3) : [],
          domain: item.domain === "work" || item.domain === "life" ? item.domain : null,
          captured_at: capture.captured_at,
        });
        committed += 1;
      } else {
        await supabase.from("thoughts").insert({
          text: capture.transcript,
          themes: Array.isArray(item.themes) ? item.themes.slice(0, 3) : [],
          captured_at: capture.captured_at,
        });
        committed += 1;
      }
    }

    await supabase.from("captures").update({ processed: true }).eq("id", capture.id);
  }

  // Daily reflection over everything captured today (including what we just
  // committed).
  const since = startOfTodayIso();
  const [thoughts, ideas, tasks] = await Promise.all([
    loadThoughtsSince(supabase, since),
    loadIdeasSince(supabase, since),
    loadTasksSince(supabase, since),
  ]);

  let wroteDigest: DigestKind | null = null;
  if (thoughts.length > 0 || ideas.length > 0 || tasks.length > 0) {
    const summary = await chatJson<SummaryResult>(
      SUMMARIZE_SYSTEM,
      buildSummarizeUser({ kind: "daily", thoughts, ideas, tasks }),
      { temperature: 0.7 },
    );
    if (summary) {
      await writeDigest(supabase, "daily", new Date().toISOString().slice(0, 10), summary, review);
      wroteDigest = "daily";
    }
  }

  return { ok: true, processed: pending.length, committed, review, digest: wroteDigest };
}

// ── Weekly / monthly: the same summarize prompt over a wider window. ──
async function runWindow(kind: "weekly" | "monthly", days: number): Promise<PipelineReport> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: "Supabase is not configured" };
  if (!hasOpenAI) return { ok: false, reason: "OpenAI is not configured" };

  const since = new Date(Date.now() - days * 24 * 3600_000).toISOString();
  const [thoughts, ideas, tasks] = await Promise.all([
    loadThoughtsSince(supabase, since),
    loadIdeasSince(supabase, since),
    loadTasksSince(supabase, since),
  ]);

  if (thoughts.length === 0 && ideas.length === 0 && tasks.length === 0) {
    return { ok: true, processed: 0, digest: null };
  }

  const summary = await chatJson<SummaryResult>(
    SUMMARIZE_SYSTEM,
    buildSummarizeUser({ kind, thoughts, ideas, tasks }),
    { temperature: 0.7 },
  );

  let wroteDigest: DigestKind | null = null;
  if (summary) {
    await writeDigest(supabase, kind, new Date().toISOString().slice(0, 10), summary, 0);
    wroteDigest = kind;
  }
  return { ok: true, digest: wroteDigest };
}

export function runWeekly(): Promise<PipelineReport> {
  return runWindow("weekly", 7);
}

export function runMonthly(): Promise<PipelineReport> {
  return runWindow("monthly", 31);
}
