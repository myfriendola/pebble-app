"use client";

import { useState, useTransition } from "react";
import { ChevronRight } from "lucide-react";
import type { Digest, ReviewItem } from "@/lib/types";
import { resolveReview, type ReviewDecision } from "@/app/actions";
import { ReviewEntry } from "./ReviewEntry";

// The evening bloom: the top of Today deepening into the full daily reflection.
// A warm paper panel — narrative, one question to sit with, and one quiet
// actionable row into the review queue, where "to check" items can be filed.
export function TodayReflection({
  digest,
  reviewItems,
}: {
  digest: Digest;
  reviewCount: number;
  reviewItems: ReviewItem[];
}) {
  const [openReview, setOpenReview] = useState(false);
  // Hide resolved items optimistically, but keep reading the list from props so
  // a live refresh can bring in anything new.
  const [resolved, setResolved] = useState<Set<string>>(() => new Set());
  const items = reviewItems.filter((i) => !resolved.has(i.id));
  const [pending, startTransition] = useTransition();
  const question = digest.questions[0];

  function resolve(id: string, decision: ReviewDecision) {
    setResolved((prev) => new Set(prev).add(id)); // optimistic
    startTransition(() => {
      void resolveReview(id, decision);
    });
  }

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

      {items.length > 0 ? (
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
              <span className="tag tag-work">{items.length} to check</span>
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
            <div className="mt-4 space-y-5 animate-fade-in">
              <p className="font-sans text-[12px] text-ink-muted">
                These weren&rsquo;t clear enough to sort on their own — file each with a tap.
              </p>
              {items.map((item) => (
                <ReviewEntry key={item.id} item={item} onResolve={resolve} disabled={pending} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
