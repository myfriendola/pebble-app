// Pure theme helpers — safe to import in both server and client components
// (no Supabase / Node imports here).

import type { ThemeFacet } from "./types";

export function groupOf(theme: string, groupMap: Record<string, string>): string {
  return groupMap[theme] ?? "Other";
}

// Count theme occurrences across items and attach each theme's group, most
// frequent first.
export function buildThemeFacets(
  items: { themes: string[] }[],
  groupMap: Record<string, string>,
): ThemeFacet[] {
  const counts = new Map<string, number>();
  for (const it of items) {
    for (const t of it.themes) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count, group: groupMap[name] ?? null }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
