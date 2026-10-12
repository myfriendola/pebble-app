"use client";

import { useMemo, useState } from "react";
import type { Idea } from "@/lib/types";
import { relativeDay } from "@/lib/format";
import { buildThemeFacets, groupOf } from "@/lib/themes";
import { IdeaRow } from "./IdeaRow";
import { ThemeFilter, type ThemeValue } from "./ThemeFilter";
import { Whisper } from "./ui";

type DomainFilter = "all" | "work" | "life";

export function IdeasView({
  ideas,
  groupMap,
}: {
  ideas: Idea[];
  groupMap: Record<string, string>;
}) {
  const [domain, setDomain] = useState<DomainFilter>("all");
  const [filter, setFilter] = useState<ThemeValue>({ category: null, theme: null });

  const inDomain = useMemo(
    () => (domain === "all" ? ideas : ideas.filter((i) => i.domain === domain)),
    [ideas, domain],
  );

  // Theme facets reflect the current Work/Life scope.
  const facets = useMemo(() => buildThemeFacets(inDomain, groupMap), [inDomain, groupMap]);

  const filtered = useMemo(() => {
    if (filter.theme) return inDomain.filter((i) => i.themes.includes(filter.theme!));
    if (filter.category)
      return inDomain.filter((i) => i.themes.some((t) => groupOf(t, groupMap) === filter.category));
    return inDomain;
  }, [inDomain, filter, groupMap]);

  const groups = useMemo(() => {
    const out: { day: string; items: Idea[] }[] = [];
    for (const i of filtered) {
      const day = relativeDay(i.captured_at);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(i);
      else out.push({ day, items: [i] });
    }
    return out;
  }, [filtered]);

  const active = filter.theme ?? filter.category;

  return (
    <div>
      {/* Work / Life / All — like Tasks. */}
      <div className="mb-6 inline-flex rounded-pill border border-hairline bg-panel/40 p-1">
        {(["all", "work", "life"] as const).map((d) => (
          <button
            key={d}
            onClick={() => {
              setDomain(d);
              setFilter({ category: null, theme: null });
            }}
            aria-pressed={domain === d}
            className={[
              "rounded-pill px-4 py-1.5 font-sans text-[12px] uppercase tracking-label transition-colors",
              domain === d ? "bg-sage-tint text-sage" : "text-ink-muted hover:text-ink-secondary",
            ].join(" ")}
          >
            {d}
          </button>
        ))}
      </div>

      {facets.length > 0 ? <ThemeFilter facets={facets} value={filter} onChange={setFilter} /> : null}

      {groups.length === 0 ? (
        <Whisper>No sparks here yet. When one lands, it will wait for you.</Whisper>
      ) : (
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.day}>
              <div className="label mb-4">{group.day}</div>
              <div className="divide-y divide-hairline">
                {group.items.map((i) => (
                  <IdeaRow
                    key={i.id}
                    idea={i}
                    showThemes={!active}
                    showDomain={domain === "all"}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
