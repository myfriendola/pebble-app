"use client";

import { useMemo, useState } from "react";
import type { Idea } from "@/lib/types";
import { relativeDay } from "@/lib/format";
import { IdeaRow } from "./IdeaRow";
import { Whisper } from "./ui";

type DomainFilter = "all" | "work" | "life";

export function IdeasView({ ideas, themes }: { ideas: Idea[]; themes: string[] }) {
  const [domain, setDomain] = useState<DomainFilter>("all");
  const [theme, setTheme] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      ideas.filter(
        (i) =>
          (domain === "all" || i.domain === domain) &&
          (theme === null || i.themes.includes(theme)),
      ),
    [ideas, domain, theme],
  );

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

  return (
    <div>
      {/* Work / Life / All — like Tasks. */}
      <div className="mb-6 inline-flex rounded-pill border border-hairline bg-panel/40 p-1">
        {(["all", "work", "life"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDomain(d)}
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

      {/* Theme filter pills — like Thoughts. */}
      {themes.length > 0 ? (
        <div className="mb-9 flex flex-wrap gap-2">
          <FilterPill active={theme === null} onClick={() => setTheme(null)}>
            all themes
          </FilterPill>
          {themes.map((t) => (
            <FilterPill key={t} active={theme === t} onClick={() => setTheme(t)}>
              {t}
            </FilterPill>
          ))}
        </div>
      ) : null}

      {groups.length === 0 ? (
        <Whisper>No sparks here yet. When one lands, it will wait for you.</Whisper>
      ) : (
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.day}>
              <div className="label mb-4">{group.day}</div>
              <div className="divide-y divide-hairline">
                {group.items.map((i) => (
                  <IdeaRow key={i.id} idea={i} showThemes={theme === null} showDomain={domain === "all"} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={[
        "rounded-pill border px-3.5 py-1.5 font-sans text-[12px] transition-colors",
        active
          ? "border-sage-ring2 bg-sage-tint text-sage"
          : "border-hairline text-ink-muted hover:border-sage-ring hover:text-ink-secondary",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
