"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import type { ThreadNote } from "@/lib/types";
import { shortDate } from "@/lib/format";
import { deleteThread, removeFromThread, renameThread } from "@/app/threads/actions";
import { SwipeRow } from "./SwipeRow";
import { CheckRing } from "./CheckRing";

// ── Title + one line on what it is (Pebble drafts it; you can edit) ─────────
export function ThreadHeader({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [t, setT] = useState(title);
  const [d, setD] = useState(description ?? "");
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      await renameThread(id, t, d);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="mb-2 space-y-3 animate-fade-in">
        <input
          value={t}
          onChange={(e) => setT(e.target.value)}
          aria-label="Thread name"
          maxLength={80}
          className="w-full rounded-control border border-hairline bg-paper px-3 py-2 font-serif text-[24px] text-ink outline-none focus:border-sage-ring"
        />
        <textarea
          value={d}
          onChange={(e) => setD(e.target.value)}
          aria-label="What this is"
          placeholder="One line on what this is"
          rows={2}
          maxLength={240}
          className="w-full resize-none rounded-control border border-hairline bg-paper px-3 py-2 font-serif text-[16px] italic text-ink-secondary outline-none focus:border-sage-ring"
        />
        <div className="flex items-center gap-4">
          <button
            onClick={save}
            disabled={pending || !t.trim()}
            className="rounded-pill bg-sage px-4 py-1.5 font-sans text-[13px] text-paper disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => {
              setT(title);
              setD(description ?? "");
              setEditing(false);
            }}
            className="font-sans text-[13px] text-ink-muted hover:text-ink-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <header className="group animate-fade-in">
      <div className="flex items-start gap-3">
        <h1 className="font-serif text-[30px] leading-[1.1] tracking-[-0.01em] text-ink">{title}</h1>
        <button
          onClick={() => setEditing(true)}
          aria-label="Edit name and description"
          title="Edit"
          className="mt-2 p-1 text-ink-muted opacity-60 transition hover:text-sage hover:opacity-100"
        >
          <Pencil size={15} strokeWidth={1.5} />
        </button>
      </div>
      {description ? (
        <p className="mt-2 font-serif text-[16px] italic leading-[1.6] text-ink-secondary">{description}</p>
      ) : null}
    </header>
  );
}

// ── One note in the thread ──────────────────────────────────────────────────
// Swipe left on a phone (or use the quiet link on a computer) for "Not about
// this": it leaves the thread for good but stays in Thoughts / Ideas / Tasks.
export function ThreadNoteRow({ threadId, note }: { threadId: string; note: ThreadNote }) {
  const [gone, setGone] = useState(false);
  const [done, setDone] = useState(note.status === "done");
  const task = note.kind === "work_task" || note.kind === "life_task";
  const kindLabel =
    note.kind === "idea" ? "spark" : note.kind === "thought" ? "thought" : note.kind === "work_task" ? "work" : "life";

  const remove = () => removeFromThread(threadId, note.kind, note.id);
  if (gone) return null;

  return (
    <SwipeRow
      id={`note-${note.kind}-${note.id}`}
      onDelete={remove}
      actionLabel={
        <span>
          Not about
          <br />
          this
        </span>
      }
      actionAria="Not about this thread"
      actionClassName="bg-ink-muted"
      contentClassName="group py-5"
    >
      {task ? (
        <div className="flex items-start gap-3">
          <CheckRing
            id={note.id}
            domain={note.kind === "work_task" ? "work" : "life"}
            initialDone={done}
            onChange={setDone}
          />
          <div className="min-w-0 flex-1">
            <p
              className={[
                "font-sans text-[15px] leading-[1.5] transition-colors",
                done ? "text-ink-muted line-through decoration-hairline" : "text-ink",
              ].join(" ")}
            >
              {note.text}
            </p>
            {note.quote && note.quote !== note.text ? (
              <p className="mt-1.5 border-l-2 border-sage-tint pl-3 font-serif text-[14.5px] italic leading-[1.55] text-ink-secondary">
                {note.quote}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="prose-serif">{note.text}</p>
      )}
      <div className={`mt-2 flex items-center gap-3 ${task ? "pl-[34px]" : ""}`}>
        <span className="label">{shortDate(note.captured_at)}</span>
        <span className="label">{kindLabel}</span>
        <button
          onClick={() => {
            setGone(true);
            void remove();
          }}
          className="ml-auto hidden font-sans text-[12px] text-ink-muted opacity-0 transition hover:text-ink-secondary focus:opacity-100 group-hover:opacity-100 sm:inline"
        >
          not about this
        </button>
      </div>
    </SwipeRow>
  );
}

// ── Letting a thread go ─────────────────────────────────────────────────────
export function ThreadDelete({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();

  if (!asking) {
    return (
      <button
        onClick={() => setAsking(true)}
        className="font-sans text-[12px] text-ink-muted transition-colors hover:text-clay"
      >
        Delete this thread
      </button>
    );
  }
  return (
    <div className="animate-fade-in">
      <p className="font-sans text-[13px] text-ink-secondary">
        Delete {title}? Every note in it stays where it lives.
      </p>
      <div className="mt-2 flex items-center gap-4">
        <button
          onClick={() =>
            start(async () => {
              await deleteThread(id);
              router.push("/threads");
            })
          }
          disabled={pending}
          className="font-sans text-[13px] text-clay disabled:opacity-50"
        >
          {pending ? "Deleting…" : "Delete"}
        </button>
        <button onClick={() => setAsking(false)} className="font-sans text-[13px] text-ink-muted">
          Keep it
        </button>
      </div>
    </div>
  );
}
