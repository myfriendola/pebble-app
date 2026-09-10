"use client";

import { useState } from "react";
import type { Idea } from "@/lib/types";
import { formatTime } from "@/lib/format";
import { Tag } from "./ui";
import { NoodleBlock } from "./NoodleBlock";

export function IdeaRow({
  idea,
  showThemes = true,
  showDomain = true,
}: {
  idea: Idea;
  showThemes?: boolean;
  showDomain?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasThread = Boolean(idea.noodle?.prompt);

  return (
    <div className="py-5 first:pt-0 last:pb-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group block w-full cursor-pointer text-left"
      >
        <p className="prose-serif transition-colors group-hover:text-black">{idea.text}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="label">{formatTime(idea.captured_at)}</span>
          {hasThread ? (
            <span
              aria-hidden
              title="A reflection has begun here"
              className="h-1.5 w-1.5 rounded-full bg-sage-ring2"
            />
          ) : null}
          {showDomain && idea.domain ? <Tag kind={idea.domain}>{idea.domain}</Tag> : null}
          {showThemes
            ? idea.themes.map((theme) => (
                <Tag key={theme} kind="theme">
                  {theme}
                </Tag>
              ))
            : null}
        </div>
      </button>

      {open ? (
        <NoodleBlock
          targetKind="idea"
          targetId={idea.id}
          text={idea.text}
          initialQuestion={idea.noodle?.prompt ?? null}
          initialReply={idea.noodle?.reply ?? null}
          openAsPageHref={`/ideas/${idea.id}`}
        />
      ) : null}
    </div>
  );
}
