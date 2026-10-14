// Gathers everything in Pebble into a single portable bundle — a complete JSON
// backup you can keep (and, if it ever came to it, restore from), plus a
// human-readable Markdown archive of your thoughts, ideas, tasks and
// reflections. Push subscriptions are deliberately left out (device tokens, not
// your content).

import type { SupabaseClient } from "@supabase/supabase-js";

const TABLES = [
  "captures",
  "thoughts",
  "ideas",
  "work_tasks",
  "life_tasks",
  "noodles",
  "digests",
  "review_queue",
  "theme_groups",
] as const;

export interface ExportBundle {
  app: "pebble";
  version: 1;
  exported_at: string;
  counts: Record<string, number>;
  data: Record<string, Record<string, unknown>[]>;
}

export async function collectExport(supabase: SupabaseClient): Promise<ExportBundle> {
  const data: Record<string, Record<string, unknown>[]> = {};
  const counts: Record<string, number> = {};
  for (const table of TABLES) {
    const { data: rows } = await supabase.from(table).select("*");
    const list = (rows ?? []) as Record<string, unknown>[];
    data[table] = list;
    counts[table] = list.length;
  }
  return { app: "pebble", version: 1, exported_at: new Date().toISOString(), counts, data };
}

function day(iso: unknown): string {
  return typeof iso === "string" ? iso.slice(0, 10) : "";
}

function byCapturedDesc(a: Record<string, unknown>, b: Record<string, unknown>): number {
  return String(b.captured_at ?? "") < String(a.captured_at ?? "") ? -1 : 1;
}

export function toMarkdown(b: ExportBundle): string {
  const out: string[] = [];
  out.push("# Pebble — your archive", "", `_Exported ${b.exported_at.slice(0, 10)}_`, "");

  const digests = (b.data.digests ?? []) as Record<string, unknown>[];
  const thoughts = [...((b.data.thoughts ?? []) as Record<string, unknown>[])].sort(byCapturedDesc);
  const ideas = [...((b.data.ideas ?? []) as Record<string, unknown>[])].sort(byCapturedDesc);
  const tasks: Record<string, unknown>[] = [
    ...((b.data.work_tasks ?? []) as Record<string, unknown>[]).map((t) => ({ ...t, domain: "work" })),
    ...((b.data.life_tasks ?? []) as Record<string, unknown>[]).map((t) => ({ ...t, domain: "life" })),
  ].sort(byCapturedDesc);

  // ── Reflections ─────────────────────────────────────────────────────────
  if (digests.length > 0) {
    out.push("## Reflections", "");
    for (const kind of ["monthly", "weekly", "daily"] as const) {
      const ofKind = digests
        .filter((d) => d.kind === kind)
        .sort((a, b2) => (String(b2.period_date) < String(a.period_date) ? -1 : 1));
      for (const d of ofKind) {
        out.push(`### ${String(d.kind)} · ${day(d.period_date)}`, "");
        if (d.narrative) out.push(String(d.narrative), "");
        const qs = Array.isArray(d.questions) ? (d.questions as string[]) : [];
        for (const q of qs) out.push(`> ${q}`);
        if (qs.length) out.push("");
      }
    }
  }

  // ── Thoughts ────────────────────────────────────────────────────────────
  if (thoughts.length > 0) {
    out.push("## Thoughts", "");
    for (const t of thoughts) {
      const themes = Array.isArray(t.themes) && t.themes.length ? ` _(${(t.themes as string[]).join(", ")})_` : "";
      out.push(`- **${day(t.captured_at)}** — ${String(t.text ?? "").trim()}${themes}`);
    }
    out.push("");
  }

  // ── Ideas ───────────────────────────────────────────────────────────────
  if (ideas.length > 0) {
    out.push("## Ideas", "");
    for (const i of ideas) {
      const themes = Array.isArray(i.themes) && i.themes.length ? ` _(${(i.themes as string[]).join(", ")})_` : "";
      out.push(`- **${day(i.captured_at)}** — ${String(i.text ?? "").trim()}${themes}`);
    }
    out.push("");
  }

  // ── Tasks ───────────────────────────────────────────────────────────────
  if (tasks.length > 0) {
    out.push("## Tasks", "");
    for (const t of tasks) {
      const done = t.status === "done";
      const due = t.due ? ` _(due ${day(t.due)})_` : "";
      out.push(`- [${done ? "x" : " "}] ${String(t.action ?? "").trim()} · ${t.domain}${due}`);
    }
    out.push("");
  }

  return out.join("\n");
}
