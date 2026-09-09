"use client";

import { useMemo, useState } from "react";
import type { Thought } from "@/lib/types";
import { relativeDay } from "@/lib/format";
import { ThoughtRow } from "./ThoughtRow";
import { Whisper } from "./ui";

export function ThoughtsView({
  thoughts,
  themes,
}: {
  thoughts: Thought[];
  themes: string[];
}) {
  const [active, setActive] = useState<string | null>(null);

  const filtered = useMemo(
    () => (active ? thoughts.filter((t) => t.themes.includes(active)) : thoughts),
    [thoughts, active],
  );

  // Group by day, preserving the newest-first order.
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

  return (
    <div>
      {/* Theme filter pills — sage when active. */}
      {themes.length > 0 ? (
        <div className="mb-9 flex flex-wrap gap-2">
          <FilterPill active={active === null} onClick={() => setActive(null)}>
            all
          </FilterPill>
          {themes.map((theme) => (
            <FilterPill key={theme} active={active === theme} onClick={() => setActive(theme)}>
              {theme}
            </FilterPill>
          ))}
        </div>
      ) : null}

      {active ? (
        <p className="mb-6 font-serif text-[16px] italic text-ink-muted">
          Every time &ldquo;{active}&rdquo; has surfaced, gathered across days.
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
                  <ThoughtRow key={t.id} thought={t} showThemes={active === null} />
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
