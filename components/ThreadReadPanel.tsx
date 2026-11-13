"use client";

import { useEffect, useRef, useState } from "react";
import type { ItemRef, ReadPoint, ThreadRead } from "@/lib/types";
import { shortDate, timeAgo } from "@/lib/format";
import { gatherThread, readThread } from "@/app/threads/actions";

// Pebble's read of a thread: a candid but kind collaborator's take, in the
// app's own voice and kept apart from your words. Every point cites the notes
// it draws on; tapping a date jumps to that note.
//
// It writes itself the first time (after gathering older notes when the thread
// is brand new) and rereads on its own once three new notes have joined.
// Otherwise it says honestly how fresh it is, with a Refresh.

type Phase = "idle" | "gathering" | "reading" | "error";

export function ThreadReadPanel({
  threadId,
  title,
  read,
  readAt,
  readItemCount,
  itemCount,
  index,
  canRead,
  fresh,
}: {
  threadId: string;
  title: string;
  read: ThreadRead | null;
  readAt: string | null;
  readItemCount: number;
  itemCount: number;
  index: Record<string, string>; // "kind:id" → captured_at, for notes on this page
  canRead: boolean;
  fresh: boolean; // just made: gather older notes first
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [found, setFound] = useState<number | null>(null);
  const started = useRef(false);
  const newSince = Math.max(0, itemCount - readItemCount);

  async function run(gather: boolean) {
    try {
      if (gather) {
        setPhase("gathering");
        const { added } = await gatherThread(threadId);
        setFound(added);
      }
      setPhase("reading");
      const { ok } = await readThread(threadId);
      setPhase(ok ? "idle" : "error");
    } catch {
      setPhase("error");
    }
  }

  useEffect(() => {
    if (started.current || !canRead) return;
    started.current = true;
    if (fresh) {
      // Drop ?new=1 so a reload doesn't gather again.
      window.history.replaceState(null, "", `/threads/${threadId}`);
      void run(true);
    } else if (itemCount > 0 && (!read || newSince >= 3)) {
      void run(false);
    }
    // Runs once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!canRead || (itemCount === 0 && phase === "idle" && !read)) return null;

  const working = phase === "gathering" || phase === "reading";
  const status =
    phase === "gathering"
      ? `Looking back through older notes about ${title}…`
      : phase === "reading"
        ? read
          ? `Rereading with ${newSince > 0 ? `${newSince} new note${newSince === 1 ? "" : "s"}` : "everything"}…`
          : found
            ? `Found ${found} older note${found === 1 ? "" : "s"}. Now reading them all…`
            : "Reading these notes…"
        : null;

  return (
    <section className="rounded-card bg-panel px-6 py-6 sm:px-8 sm:py-7" aria-busy={working}>
      <div className="label mb-4">Pebble&rsquo;s read</div>

      {status ? (
        <p className="mb-4 inline-flex items-center gap-2 font-sans text-[13px] text-ink-secondary">
          <span aria-hidden className="breathe-dot" />
          {status}
        </p>
      ) : null}

      {phase === "error" ? (
        <p className="mb-4 font-sans text-[13px] text-ink-secondary">
          Couldn&rsquo;t finish the read just now.{" "}
          <button onClick={() => run(false)} className="text-sage hover:opacity-70">
            Try again
          </button>
        </p>
      ) : null}

      {read ? (
        <div className={`space-y-7 transition-opacity duration-500 ${working ? "opacity-50" : ""}`}>
          {read.gist ? <p className="prose-serif text-[17px] text-ink">{read.gist}</p> : null}

          <Points label="Keeps coming up" points={read.recurring} index={index} />
          <Points label="Tensions" points={read.tensions} index={index} />
          <Points label="What’s shifted" points={read.shifts} index={index} />
          <Points label="Open questions" points={read.questions} index={index} question />
          <Moves points={read.moves} index={index} />

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-hairline pt-4 font-sans text-[12px] text-ink-muted">
            <span>
              Read from {readItemCount} note{readItemCount === 1 ? "" : "s"}
              {readAt ? ` ${timeAgo(readAt)}` : ""}
            </span>
            {newSince > 0 ? <span>· {newSince} new since</span> : null}
            <span>·</span>
            <button onClick={() => run(false)} disabled={working} className="text-sage hover:opacity-70 disabled:opacity-40">
              Refresh
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Points({
  label,
  points,
  index,
  question = false,
}: {
  label: string;
  points: ReadPoint[];
  index: Record<string, string>;
  question?: boolean;
}) {
  if (!points.length) return null;
  return (
    <div>
      <div className="label mb-2.5">{label}</div>
      <ul className="space-y-2.5">
        {points.map((p) => (
          <li
            key={p.text}
            className={[
              "font-serif text-[15.5px] leading-[1.6]",
              question ? "italic text-ink-secondary" : "text-ink",
            ].join(" ")}
          >
            {p.text}
            <Cites cites={p.cites} index={index} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Moves({ points, index }: { points: ReadPoint[]; index: Record<string, string> }) {
  if (!points.length) return null;
  return (
    <div>
      <div className="label mb-2.5">Next moves</div>
      <ol className="space-y-3.5">
        {points.map((p, i) => (
          <li key={p.text} className="flex gap-3">
            <span className="mt-[1px] font-sans text-[13px] text-sage">{i + 1}</span>
            <div>
              <p className="font-sans text-[15px] leading-[1.5] text-ink">{p.text}</p>
              {p.why ? (
                <p className="mt-0.5 font-serif text-[14.5px] italic leading-[1.55] text-ink-secondary">
                  {p.why}
                  <Cites cites={p.cites} index={index} />
                </p>
              ) : (
                <Cites cites={p.cites} index={index} />
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Small date chips for the notes behind a point. Tap to jump there.
function Cites({ cites, index }: { cites: ItemRef[]; index: Record<string, string> }) {
  const valid = cites.filter((c) => index[`${c.kind}:${c.id}`]);
  if (!valid.length) return null;
  const shown = valid.slice(0, 3);
  return (
    <span className="ml-1.5 inline-flex translate-y-[-1px] flex-wrap items-center gap-1 align-middle not-italic">
      {shown.map((c) => (
        <button
          key={`${c.kind}:${c.id}`}
          onClick={() => jumpTo(c)}
          title="Go to this note"
          className="rounded-pill border border-hairline bg-paper/60 px-1.5 py-[1px] font-sans text-[10.5px] leading-[1.5] text-ink-muted transition-colors hover:border-sage-ring hover:text-sage"
        >
          {shortDate(index[`${c.kind}:${c.id}`])}
        </button>
      ))}
      {valid.length > 3 ? (
        <span className="font-sans text-[10.5px] text-ink-muted">+{valid.length - 3}</span>
      ) : null}
    </span>
  );
}

function jumpTo(c: ItemRef) {
  const el = document.getElementById(`note-${c.kind}-${c.id}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.remove("cite-flash");
  void el.offsetWidth; // restart the animation
  el.classList.add("cite-flash");
}
