"use client";

import { useState, useTransition } from "react";
import { lookForThreads } from "@/app/threads/actions";

// Pebble looks for threads each night; this lets you ask it to look now, and
// says plainly what it found, or what came closest and why it didn't ask.
export function LookForThreads() {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function look() {
    setMessage(null);
    start(async () => {
      try {
        const r = await lookForThreads();
        setMessage(r.message);
      } catch {
        setMessage("Couldn't look just now. Try again in a moment.");
      }
    });
  }

  return (
    <div className="font-sans text-[12px] leading-[1.6] text-ink-muted">
      <span>Pebble looks for new threads each night. </span>
      <button
        onClick={look}
        disabled={pending}
        className="inline-flex items-center gap-1.5 text-sage transition-opacity hover:opacity-70 disabled:opacity-60"
      >
        {pending ? (
          <>
            <span aria-hidden className="breathe-dot" />
            Looking over the last 30 days…
          </>
        ) : (
          "Look now"
        )}
      </button>
      {message ? (
        <p aria-live="polite" className="prose-question mt-2 animate-fade-in text-[15px] text-ink-secondary">
          {message}
        </p>
      ) : null}
    </div>
  );
}
