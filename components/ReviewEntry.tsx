"use client";

import type { ReviewItem } from "@/lib/types";
import type { ReviewDecision } from "@/app/actions";

// One note the sorter wasn't sure about: your words, its best guess, and a
// quiet row to file it with a tap. Shared by the evening reflection and the
// "Just arrived" list on Today, so an unsure note is never hidden until night.
export function ReviewEntry({
  item,
  onResolve,
  disabled,
  hint,
}: {
  item: ReviewItem;
  onResolve: (id: string, decision: ReviewDecision) => void;
  disabled: boolean;
  hint?: string;
}) {
  const g = item.best_guess;
  const guess = g
    ? [g.type, g.domain].filter(Boolean).join(" · ") +
      (typeof g.confidence === "number" ? ` · ${Math.round(g.confidence * 100)}%` : "")
    : null;
  const meta = [hint, guess ? `best guess: ${guess}` : null].filter(Boolean).join(" · ");

  return (
    <div className="border-l-2 border-sage-tint pl-3">
      <p className="prose-serif text-[15.5px] text-ink-secondary">
        {item.transcript ?? g?.note ?? "—"}
      </p>
      {meta ? <div className="label mt-1.5">{meta}</div> : null}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="label">File as</span>
        <ResolveButton onClick={() => onResolve(item.id, "task")} disabled={disabled}>
          task
        </ResolveButton>
        <ResolveButton onClick={() => onResolve(item.id, "thought")} disabled={disabled}>
          thought
        </ResolveButton>
        <ResolveButton onClick={() => onResolve(item.id, "idea")} disabled={disabled}>
          idea
        </ResolveButton>
        <button
          onClick={() => onResolve(item.id, "dismiss")}
          disabled={disabled}
          className="font-sans text-[12px] text-ink-muted transition-colors hover:text-ink-secondary disabled:opacity-40"
        >
          dismiss
        </button>
      </div>
    </div>
  );
}

function ResolveButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="font-sans text-[12px] text-sage transition-opacity hover:opacity-70 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
