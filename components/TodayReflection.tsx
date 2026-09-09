"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Digest, ReviewItem } from "@/lib/types";

// The evening bloom: the top of Today deepening into the full daily reflection.
// A warm paper panel — narrative, one question to sit with, and one quiet
// actionable row into the review queue.
export function TodayReflection({
  digest,
  reviewCount,
  reviewItems,
}: {
  digest: Digest;
  reviewCount: number;
  reviewItems: ReviewItem[];
}) {
  const [openReview, setOpenReview] = useState(false);
  const question = digest.questions[0];

  return (
    <section className="animate-fade-in-slow rounded-card bg-panel px-6 py-7 sm:px-8 sm:py-8">
      <div className="label mb-4 text-ink-muted">Today&rsquo;s reflection</div>

      <p className="prose-serif text-[17px] text-ink">{digest.narrative}</p>

      {question ? (
        <div className="mt-6">
          <div className="label mb-2 text-ink-muted">A question to sit with</div>
          <p className="prose-question text-[17px] leading-[1.6]">{question}</p>
        </div>
      ) : null}

      {reviewCount > 0 ? (
        <div className="mt-7 border-t border-hairline pt-4">
          <button
            onClick={() => setOpenReview((v) => !v)}
            aria-expanded={openReview}
            className="group flex w-full items-center justify-between gap-3"
          >
            <span className="font-sans text-[13px] text-ink-secondary transition-colors group-hover:text-ink">
              Review how today sorted
            </span>
            <span className="flex items-center gap-2">
              <span className="tag tag-work">{reviewCount} to check</span>
              <ChevronRight
                size={16}
                strokeWidth={1.5}
                className={[
                  "text-ink-muted transition-transform",
                  openReview ? "rotate-90" : "",
                ].join(" ")}
              />
            </span>
          </button>

          {openReview ? (
            <div className="mt-4 space-y-4 animate-fade-in">
              <p className="font-sans text-[12px] text-ink-muted">
                These weren&rsquo;t clear enough to sort on their own — a glance is all they need.
              </p>
              {reviewItems.map((item) => {
                const g = item.best_guess;
                const guess = g
                  ? [g.type, g.domain].filter(Boolean).join(" · ") +
                    (typeof g.confidence === "number"
                      ? ` · ${Math.round(g.confidence * 100)}%`
                      : "")
                  : null;
                return (
                  <div key={item.id} className="border-l-2 border-sage-tint pl-3">
                    <p className="prose-serif text-[15.5px] text-ink-secondary">
                      {item.transcript ?? g?.note ?? "—"}
                    </p>
                    {guess ? <div className="label mt-1.5">best guess: {guess}</div> : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
