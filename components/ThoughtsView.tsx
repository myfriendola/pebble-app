"use client";

import { useMemo, useState } from "react";
import type { Thought } from "@/lib/types";
import { relativeDay } from "@/lib/format";
import { buildThemeFacets, groupOf } from "@/lib/themes";
import { ThoughtRow } from "./ThoughtRow";
import { ThemeFilter, type ThemeValue } from "./ThemeFilter";
import { ShowEarlier } from "./ShowEarlier";
import { Whisper } from "./ui";

export function ThoughtsView({
  thoughts,
  groupMap,
  moreHref,
}: {
  thoughts: Thought[];
  groupMap: Record<string, string>;
  moreHref?: string;
}) {
  const [filter, setFilter] = useState<ThemeValue>({ category: null, theme: null });

  const facets = useMemo(() => buildThemeFacets(thoughts, groupMap), [thoughts, groupMap]);

  const filtered = useMemo(() => {
    if (filter.theme) return thoughts.filter((t) => t.themes.includes(filter.theme!));
    if (filter.category)
      return thoughts.filter((t) => t.themes.some((th) => groupOf(th, groupMap) === filter.category));
    return thoughts;
  }, [thoughts, filter, groupMap]);

  // Group by day, newest first.
  const groups = useMemo(() => {
    const out: { day: string; items: Thought[] }[] = [];
    for (const t of filtered) {
      const day = relativeDay(t.captured_at);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(t);
      else out.push({ day, items: [t] });
    }
    return out;
  }, [filtered]);

  const active = filter.theme ?? filter.category;

  return (
    <div>
      {facets.length > 0 ? <ThemeFilter facets={facets} value={filter} onChange={setFilter} /> : null}

      {active ? (
        <p className="mb-6 font-serif text-[16px] italic text-ink-muted">
          {filter.theme
            ? `Every time “${filter.theme}” has surfaced, gathered across days.`
            : `Thoughts across your ${filter.category!.toLowerCase()} threads.`}
        </p>
      ) : null}

      {groups.length === 0 ? (
        <Whisper>Nothing on this thread yet.</Whisper>
      ) : (
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.day}>
              <div className="label mb-4">{group.day}</div>
              <div className="divide-y divide-hairline">
                {group.items.map((t) => (
                  <ThoughtRow key={t.id} thought={t} showThemes={!active} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {!active && moreHref ? <ShowEarlier href={moreHref} /> : null}
    </div>
  );
}
