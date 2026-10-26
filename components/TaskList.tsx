"use client";

import { useState } from "react";
import { Calendar, Pencil } from "lucide-react";
import type { Task } from "@/lib/types";
import { formatDue } from "@/lib/format";
import { deleteItem } from "@/app/actions";
import { CheckRing } from "./CheckRing";
import { ItemEditor } from "./ItemEditor";
import { SwipeRow } from "./SwipeRow";
import { CopyButton } from "./CopyButton";
import { Whisper } from "./ui";

function TaskRow({ task }: { task: Task }) {
  const [done, setDone] = useState(task.status === "done");
  const [editing, setEditing] = useState(false);
  const due = formatDue(task.due);
  const kind = task.domain === "work" ? "work_task" : "life_task";

  if (editing) {
    return (
      <div className="flex gap-3.5 py-5">
        <CheckRing id={task.id} domain={task.domain} initialDone={done} onChange={setDone} />
        <div className="min-w-0 flex-1">
          <ItemEditor
            kind={kind}
            id={task.id}
            initialText={task.source_quote ?? task.action}
            textClassName="font-serif text-[15px] italic"
            onDone={() => setEditing(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <SwipeRow
      onDelete={() => deleteItem(kind, task.id)}
      contentClassName={`flex gap-3.5 py-5 transition-opacity duration-500 ${done ? "opacity-40" : ""}`}
    >
      <CheckRing id={task.id} domain={task.domain} initialDone={done} onChange={setDone} />
      <div className="min-w-0 flex-1">
        <p className="font-sans text-[15px] leading-snug text-ink">{task.action}</p>

        {due ? (
          <div className="mt-1.5 flex items-center gap-1 text-ink-muted">
            <Calendar size={12} strokeWidth={1.5} />
            <span className="font-sans text-[12px]">{due}</span>
          </div>
        ) : null}

        {task.source_quote ? (
          <p className="mt-3 border-l-2 border-sage-tint pl-3 font-serif text-[15px] italic leading-[1.6] text-ink-secondary">
            {task.source_quote}
          </p>
        ) : null}

        <div className="mt-2 flex items-center gap-2">
          <CopyButton text={task.action} />
          <button
            onClick={() => setEditing(true)}
            aria-label="Edit entry"
            title="Edit"
            className="-m-1 p-1 text-ink-muted transition-colors hover:text-sage"
          >
            <Pencil size={15} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </SwipeRow>
  );
}

export function TaskList({ work, life }: { work: Task[]; life: Task[] }) {
  const [tab, setTab] = useState<"work" | "life">("work");
  const tasks = tab === "work" ? work : life;

  return (
    <div>
      {/* Calm Work / Life segmented control. */}
      <div className="mb-7 inline-flex rounded-pill border border-hairline bg-panel/40 p-1">
        {(["work", "life"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={[
              "rounded-pill px-5 py-1.5 font-sans text-[12px] uppercase tracking-label transition-colors",
              tab === t ? "bg-sage-tint text-sage" : "text-ink-muted hover:text-ink-secondary",
            ].join(" ")}
          >
            {t}
          </button>
        ))}
      </div>

      {tasks.length === 0 ? (
        <Whisper>
          {tab === "work"
            ? "No work to-dos right now. A clear desk."
            : "Nothing on the personal list. Enjoy the quiet."}
        </Whisper>
      ) : (
        <div className="divide-y divide-hairline">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
