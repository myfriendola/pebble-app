"use client";

import { useState } from "react";
import type { Thought } from "@/lib/types";
import { formatTime } from "@/lib/format";
import { Tag } from "./ui";
import { NoodleBlock } from "./NoodleBlock";
import { ItemEditor } from "./ItemEditor";

export function ThoughtRow({
  thought,
  showThemes = true,
}: {
  thought: Thought;
  showThemes?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const hasThread = Boolean(thought.noodle?.prompt);

  if (editing) {
    return (
      <div className="py-5 first:pt-0 last:pb-0">
        <ItemEditor
          kind="thought"
          id={thought.id}
          initialText={thought.text}
          onDone={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="py-5 first:pt-0 last:pb-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group block w-full cursor-pointer text-left"
      >
        <p className="prose-serif transition-colors group-hover:text-black">{thought.text}</p>
      </button>
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
        <button
          onClick={() => setEditing(true)}
          className="ml-auto font-sans text-[11px] uppercase tracking-label text-ink-muted transition-colors hover:text-sage"
        >
          Edit
        </button>
      </div>

      {open ? (
        <NoodleBlock
          targetKind="thought"
          targetId={thought.id}
          text={thought.text}
          initialQuestion={thought.noodle?.prompt ?? null}
          initialReply={thought.noodle?.reply ?? null}
          openAsPageHref={`/thoughts/${thought.id}`}
        />
      ) : null}
    </div>
  );
}
