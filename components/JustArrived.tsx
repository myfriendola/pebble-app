"use client";

import { useEffect, useState, useTransition } from "react";
import type { ReviewItem } from "@/lib/types";
import type { ArrivingNote } from "@/lib/data";
import { formatTime } from "@/lib/format";
import { resolveReview, sortWaitingNotes, type ReviewDecision } from "@/app/actions";
import { SectionLabel } from "./ui";
import { ReviewEntry } from "./ReviewEntry";

// The landing spot at the top of Today. A note shows here, in your own words,
// the moment it reaches Pebble, while the sort finds its home (a second or two,
// usually). Once sorted it moves to Thoughts / Sparks / To do on the next
// refresh. Notes the sorter wasn't sure about wait here too, ready to file,
// instead of hiding until the evening reflection.

// Past this, the background sort has certainly finished or given up, so the
// note is honestly "waiting" and can be retried by hand.
const STALE_MS = 90_000;

export function JustArrived({
  arriving,
  review,
  canSort,
}: {
  arriving: ArrivingNote[];
  review: ReviewItem[];
  canSort: boolean;
}) {
  const [resolved, setResolved] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();
  const unsure = review.filter((i) => !resolved.has(i.id));

  if (arriving.length === 0 && unsure.length === 0) return null;

  function resolve(id: string, decision: ReviewDecision) {
    setResolved((prev) => new Set(prev).add(id)); // optimistic
    startTransition(() => {
      void resolveReview(id, decision);
    });
  }

  return (
    <section className="animate-fade-in">
      <SectionLabel>Just arrived</SectionLabel>
      <div className="divide-y divide-hairline">
        {arriving.map((note) => (
          <ArrivingRow key={note.id} note={note} canSort={canSort} />
        ))}
        {unsure.map((item) => (
          <div key={item.id} className="py-5 animate-fade-in">
            <ReviewEntry
              item={item}
              onResolve={resolve}
              disabled={pending}
              hint="not sure where this goes"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function ArrivingRow({ note, canSort }: { note: ArrivingNote; canSort: boolean }) {
  // Starts "fresh" on both server and client (no clock in render, so no
  // hydration mismatch), then flips once the note has waited too long.
  const [stale, setStale] = useState(false);
  const [state, setState] = useState<"idle" | "sorting" | "failed">("idle");

  useEffect(() => {
    const left = STALE_MS - (Date.now() - new Date(note.created_at).getTime());
    if (left <= 0) {
      setStale(true);
      return;
    }
    const t = setTimeout(() => setStale(true), left);
    return () => clearTimeout(t);
  }, [note.created_at]);

  async function sortNow() {
    setState("sorting");
    try {
      const { settled } = await sortWaitingNotes();
      // On success the refreshed page moves this note to its home and this row
      // unmounts. If nothing settled, say so gently.
      setState(settled === 0 ? "failed" : "idle");
    } catch {
      setState("failed");
    }
  }

  let status: React.ReactNode;
  if (!canSort) {
    status = <span>waiting to be sorted</span>;
  } else if (state === "sorting") {
    status = <Breathing>sorting</Breathing>;
  } else if (state === "failed") {
    status = <span>couldn&rsquo;t sort just yet &middot; it&rsquo;ll settle tonight</span>;
  } else if (!stale) {
    status = <Breathing>finding its place</Breathing>;
  } else {
    status = (
      <>
        <span>still settling</span>
        <button
          onClick={sortNow}
          className="label text-sage transition-opacity hover:opacity-70"
        >
          sort now
        </button>
      </>
    );
  }

  return (
    <div className="py-5 animate-fade-in">
      <p className="prose-serif text-ink-secondary">{note.transcript}</p>
      <div className="label mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>{formatTime(note.captured_at)}</span>
        {status}
      </div>
    </div>
  );
}

function Breathing({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="breathe-dot" />
      {children}
    </span>
  );
}
