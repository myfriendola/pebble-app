"use client";

import { useMemo, useState } from "react";
import type { ThemeFacet } from "@/lib/types";

export interface ThemeValue {
  category: string | null;
  theme: string | null;
}

const DEFAULT_SHOWN = 10;

export function ThemeFilter({
  facets,
  value,
  onChange,
}: {
  facets: ThemeFacet[];
  value: ThemeValue;
  onChange: (v: ThemeValue) => void;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

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

  // Themes within the active category, filtered by the search box. Already
  // frequency-sorted, so the recurring threads lead.
  const scoped = useMemo(() => {
    let list = value.category
      ? facets.filter((f) => (f.group ?? "Other") === value.category)
      : facets;
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((f) => f.name.includes(q));
    return list;
  }, [facets, value.category, query]);

  const searching = query.trim().length > 0;
  let shown = searching || expanded ? scoped : scoped.slice(0, DEFAULT_SHOWN);
  // Keep the active theme visible even if it's past the fold.
  if (value.theme && !shown.some((f) => f.name === value.theme)) {
    const sel = scoped.find((f) => f.name === value.theme);
    if (sel) shown = [sel, ...shown];
  }
  const hidden = scoped.length - shown.length;
  const showSearch = facets.length > 12;

  function pickCategory(c: string | null) {
    setExpanded(false);
    setQuery("");
    onChange({ category: c, theme: null });
  }

  return (
    <div className="mb-9 space-y-4">
      {groups.anyGroup ? (
        <div className="flex flex-wrap gap-2">
          <Chip active={!value.category} onClick={() => pickCategory(null)}>
            all
          </Chip>
          {groups.names.map((g) => (
            <Chip key={g} active={value.category === g} onClick={() => pickCategory(g)}>
              {g.toLowerCase()}
            </Chip>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Chip active={!value.theme} onClick={() => onChange({ category: value.category, theme: null })}>
          {value.category ? `all ${value.category.toLowerCase()}` : "all themes"}
        </Chip>
        {shown.map((f) => (
          <Chip
            key={f.name}
            active={value.theme === f.name}
            onClick={() => onChange({ category: value.category, theme: f.name })}
          >
            {f.name}
            {f.count > 1 ? <span className="ml-1.5 opacity-60">{f.count}</span> : null}
          </Chip>
        ))}

        {hidden > 0 && !searching ? (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="rounded-pill px-3 py-1.5 font-sans text-[12px] text-ink-muted transition-colors hover:text-sage"
          >
            {expanded ? "show less" : `+${hidden} more`}
          </button>
        ) : null}

        {showSearch ? (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="filter…"
            aria-label="Filter themes"
            className="ml-1 w-28 rounded-pill border border-hairline bg-transparent px-3.5 py-1.5 font-sans text-[12px] text-ink placeholder:text-ink-muted focus:border-sage-ring focus:outline-none"
          />
        ) : null}
      </div>
    </div>
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
