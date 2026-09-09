"use client";

import { useMemo, useState } from "react";
import type { Digest, DigestKind } from "@/lib/types";
import { formatDayLong } from "@/lib/format";
import { Tag, Whisper } from "./ui";

const KIND_LABEL: Record<DigestKind, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export function ReflectionsView({ digests }: { digests: Digest[] }) {
  const [kind, setKind] = useState<DigestKind | "all">("all");

  const filtered = useMemo(
    () => (kind === "all" ? digests : digests.filter((d) => d.kind === kind)),
    [digests, kind],
  );

  // Threads over time: theme frequency across every reflection.
  const threads = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of digests) for (const t of d.themes) counts.set(t, (counts.get(t) ?? 0) + 1);
    const max = Math.max(1, ...Array.from(counts.values()));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([theme, count]) => ({ theme, count, pct: Math.round((count / max) * 100) }));
  }, [digests]);

  return (
    <div>
      <div className="mb-9 flex flex-wrap gap-2">
        {(["all", "daily", "weekly", "monthly"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className={[
              "rounded-pill border px-3.5 py-1.5 font-sans text-[12px] uppercase tracking-label transition-colors",
              kind === k
                ? "border-sage-ring2 bg-sage-tint text-sage"
                : "border-hairline text-ink-muted hover:border-sage-ring hover:text-ink-secondary",
            ].join(" ")}
          >
            {k}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Whisper>No reflections here yet. They gather as the days close.</Whisper>
      ) : (
        <div className="space-y-10">
          {filtered.map((d) => (
            <article key={d.id} className="animate-fade-in">
              <div className="label mb-3">
                {KIND_LABEL[d.kind]} · {formatDayLong(d.period_date)}
              </div>
              <p className="prose-serif text-[17px]">{d.narrative}</p>
              {d.questions.length > 0 ? (
                <div className="mt-4 space-y-1.5">
                  {d.questions.map((q, i) => (
                    <p key={i} className="prose-question text-[16px] leading-[1.6]">
                      {q}
                    </p>
                  ))}
                </div>
              ) : null}
              {d.themes.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {d.themes.map((t) => (
                    <Tag key={t} kind="theme">
                      {t}
                    </Tag>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {/* Threads over time — the recurring undercurrents, gently weighted. */}
      {threads.length > 0 ? (
        <section className="mt-14 border-t border-hairline pt-8">
          <div className="label mb-5">Threads over time</div>
          <ul className="space-y-3.5">
            {threads.map(({ theme, count, pct }) => (
              <li key={theme} className="flex items-center gap-4">
                <span className="w-32 shrink-0 font-serif text-[15px] text-ink-secondary">
                  {theme}
                </span>
                <span className="h-[3px] flex-1 overflow-hidden rounded-pill bg-hairline">
                  <span
                    className="block h-full rounded-pill bg-sage-ring2"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="label w-6 text-right">{count}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
