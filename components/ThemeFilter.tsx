"use client";

import { useMemo } from "react";
import type { ThemeFacet } from "@/lib/types";

export interface ThemeValue {
  category: string | null;
  theme: string | null;
}

export function ThemeFilter({
  facets,
  value,
  onChange,
}: {
  facets: ThemeFacet[];
  value: ThemeValue;
  onChange: (v: ThemeValue) => void;
}) {
  // Categories present across all themes, ordered by total frequency.
  const groups = useMemo(() => {
    const totals = new Map<string, number>();
    let anyGroup = false;
    for (const f of facets) {
      if (f.group) anyGroup = true;
      const g = f.group ?? "Other";
      totals.set(g, (totals.get(g) ?? 0) + f.count);
    }
    const names = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
    return { names, anyGroup };
  }, [facets]);

  // Themes within the active category — already frequency-sorted, so the
  // recurring threads lead. Horizontal scroll keeps it to a single line.
  const scoped = useMemo(
    () =>
      value.category ? facets.filter((f) => (f.group ?? "Other") === value.category) : facets,
    [facets, value.category],
  );

  return (
    <div className="mb-8 space-y-2">
      {groups.anyGroup ? (
        <Row>
          <Chip active={!value.category} onClick={() => onChange({ category: null, theme: null })}>
            all
          </Chip>
          {groups.names.map((g) => (
            <Chip
              key={g}
              active={value.category === g}
              onClick={() => onChange({ category: g, theme: null })}
            >
              {g.toLowerCase()}
            </Chip>
          ))}
        </Row>
      ) : null}

      <Row>
        <Chip
          active={!value.theme}
          onClick={() => onChange({ category: value.category, theme: null })}
        >
          {value.category ? `all ${value.category.toLowerCase()}` : "all themes"}
        </Chip>
        {scoped.map((f) => (
          <Chip
            key={f.name}
            active={value.theme === f.name}
            onClick={() => onChange({ category: value.category, theme: f.name })}
          >
            {f.name}
            {f.count > 1 ? (
              <span className="ml-1.5 tabular-nums opacity-50">{f.count}</span>
            ) : null}
          </Chip>
        ))}
      </Row>
    </div>
  );
}

// An edge-to-edge horizontal scroll row (bleeds past the content gutter so the
// chips can run to the screen edges).
function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="no-scrollbar -mx-6 flex gap-1.5 overflow-x-auto px-6">{children}</div>
  );
}

function Chip({
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
        "shrink-0 whitespace-nowrap rounded-pill px-3 py-1 font-sans text-[12.5px] transition-colors",
        active
          ? "bg-sage-tint text-sage"
          : "text-ink-muted hover:bg-panel hover:text-ink-secondary",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
