"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ThreadSuggestion } from "@/lib/types";
import { countPhrase, shortDate } from "@/lib/format";
import { answerSuggestion, makeThread } from "@/app/threads/actions";

// Pebble noticed a subject you keep coming back to, and asks before making it
// a thread. One question at a time, never a nag: "Not yet" waits for a few
// more notes, "Not a thing" is never asked again.
export function ThreadSuggestionCard({ suggestion }: { suggestion: ThreadSuggestion }) {
  const router = useRouter();
  const [state, setState] = useState<"asking" | "making" | "snoozed" | "declined">("asking");
  const [, start] = useTransition();

  const s = suggestion;
  const others = Math.max(0, s.note_count - s.previews.length);
  const mix = countPhrase([
    [s.kinds.thoughts, "thought", "thoughts"],
    [s.kinds.ideas, "idea", "ideas"],
    [s.kinds.tasks, "task", "tasks"],
  ]);

  async function make() {
    setState("making");
    const { id } = await makeThread(s.id);
    if (id) router.push(`/threads/${id}?new=1`);
    else setState("asking");
  }

  // Acknowledge first; then (after a breath) record it, which brings in the
  // next question if one is waiting.
  function answer(a: "snoozed" | "declined") {
    setState(a);
    setTimeout(() => {
      start(() => {
        void answerSuggestion(s.id, a);
      });
    }, s.queued > 0 ? 1600 : 0);
  }

  if (state === "snoozed" || state === "declined") {
    return (
      <p className="animate-fade-in prose-question text-[15px] text-ink-muted">
        {state === "snoozed"
          ? `Okay. I'll ask about ${s.title} again once a few more notes gather.`
          : `Got it. I won't ask about ${s.title} again.`}
      </p>
    );
  }

  return (
    <section className="animate-fade-in rounded-card bg-panel px-6 py-6 sm:px-7" aria-label="A thread worth making">
      <div className="label mb-3">
        Noticed{s.queued > 0 ? ` \u00b7 1 of ${s.queued + 1}` : ""}
      </div>
      <p className="font-serif text-[19px] leading-[1.45] text-ink">
        You keep coming back to {s.title}.
      </p>
      <p className="mt-1.5 font-sans text-[12px] text-ink-muted">
        {s.note_count} notes{s.first_at ? ` since ${shortDate(s.first_at)}` : ""}
        {mix ? `: ${mix}.` : "."}
      </p>

      {s.previews.length > 0 ? (
        <div className="mt-4 space-y-2 border-l-2 border-sage-tint pl-3">
          {s.previews.map((p) => (
            <p key={p} className="line-clamp-2 font-serif text-[15px] leading-[1.55] text-ink-secondary">
              &ldquo;{p}&rdquo;
            </p>
          ))}
          {others > 0 ? (
            <p className="font-sans text-[12px] text-ink-muted">and {others} more</p>
          ) : null}
        </div>
      ) : null}

      <p className="prose-question mt-5 text-[16px]">Give it its own thread?</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <button
          onClick={make}
          disabled={state === "making"}
          className="rounded-pill bg-sage px-4 py-1.5 font-sans text-[13px] text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {state === "making" ? "Making it…" : "Make a thread"}
        </button>
        <button
          onClick={() => answer("snoozed")}
          disabled={state === "making"}
          className="font-sans text-[13px] text-ink-secondary transition-colors hover:text-ink disabled:opacity-40"
        >
          Not yet
        </button>
        <button
          onClick={() => answer("declined")}
          disabled={state === "making"}
          className="font-sans text-[13px] text-ink-muted transition-colors hover:text-ink-secondary disabled:opacity-40"
        >
          Not a thing
        </button>
      </div>
    </section>
  );
}
