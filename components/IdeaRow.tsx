"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { Idea } from "@/lib/types";
import { formatTime } from "@/lib/format";
import { deleteItem } from "@/app/actions";
import { Tag } from "./ui";
import { NoodleBlock } from "./NoodleBlock";
import { ItemEditor } from "./ItemEditor";
import { SwipeRow } from "./SwipeRow";
import { CopyButton } from "./CopyButton";

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
  const [editing, setEditing] = useState(false);
  const hasThread = Boolean(idea.noodle?.prompt);

  if (editing) {
    return (
      <div className="py-5">
        <ItemEditor kind="idea" id={idea.id} initialText={idea.text} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <SwipeRow onDelete={() => deleteItem("idea", idea.id)}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group block w-full cursor-pointer text-left"
      >
        <p className="prose-serif transition-colors group-hover:text-black">{idea.text}</p>
      </button>
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
        <span className="ml-auto flex items-center gap-2">
          <CopyButton text={idea.text} />
          <button
            onClick={() => setEditing(true)}
            aria-label="Edit entry"
            title="Edit"
            className="-m-1 p-1 text-ink-muted transition-colors hover:text-sage"
          >
            <Pencil size={15} strokeWidth={1.5} />
          </button>
        </span>
      </div>

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
    </SwipeRow>
  );
}
