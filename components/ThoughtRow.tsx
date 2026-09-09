"use client";

import { useState } from "react";
import type { Thought } from "@/lib/types";
import { formatTime } from "@/lib/format";
import { Tag } from "./ui";
import { NoodleBlock } from "./NoodleBlock";

export function ThoughtRow({
  thought,
  showThemes = true,
  startOpen = false,
}: {
  thought: Thought;
  showThemes?: boolean;
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const hasThread = Boolean(thought.noodle?.prompt);

  return (
    <div className="py-5 first:pt-0 last:pb-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group block w-full cursor-pointer text-left"
      >
        <p className="prose-serif transition-colors group-hover:text-black">{thought.text}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="label">{formatTime(thought.captured_at)}</span>
          {hasThread ? (
            <span
              aria-hidden
              title="A reflection has begun here"
              className="h-1.5 w-1.5 rounded-full bg-sage-ring2"
            />
          ) : null}
          {showThemes
            ? thought.themes.map((theme) => (
                <Tag key={theme} kind="theme">
                  {theme}
                </Tag>
              ))
            : null}
        </div>
      </button>

      {open ? (
        <NoodleBlock
          thoughtId={thought.id}
          thoughtText={thought.text}
          initialQuestion={thought.noodle?.prompt ?? null}
          initialReply={thought.noodle?.reply ?? null}
          openAsPageHref={`/thoughts/${thought.id}`}
        />
      ) : null}
    </div>
  );
}
