"use client";

import { useState, useTransition } from "react";
import type { SortResult } from "@/lib/types";
import { saveAndReanalyze, moveItem, type ItemKind } from "@/app/actions";

// Inline text editor for a thought / idea / task. On save it re-runs the sort;
// if the category changes it asks before moving the item, so nothing silently
// jumps screens.
export function ItemEditor({
  kind,
  id,
  initialText,
  textClassName = "prose-serif",
  onDone,
}: {
  kind: ItemKind;
  id: string;
  initialText: string;
  textClassName?: string;
  onDone: () => void;
}) {
  const [value, setValue] = useState(initialText);
  const [pending, start] = useTransition();
  const [suggest, setSuggest] = useState<{ target: ItemKind; label: string; result: SortResult } | null>(
    null,
  );

  function save() {
    if (!value.trim()) return;
    start(async () => {
      const res = await saveAndReanalyze(kind, id, value);
      if (res.status === "suggest") {
        setSuggest({ target: res.target, label: res.label, result: res.result });
      } else {
        onDone();
      }
    });
  }

  function confirmMove() {
    if (!suggest) return;
    start(async () => {
      await moveItem(kind, id, suggest.target, suggest.result, value);
      onDone();
    });
  }

  return (
    <div className="animate-fade-in">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        autoFocus
        disabled={pending}
        className={`w-full resize-none rounded-control border border-hairline bg-paper px-3 py-2 leading-[1.6] text-ink focus:border-sage-ring focus:outline-none ${textClassName}`}
      />

      {!suggest ? (
        <div className="mt-1.5 flex items-center gap-4">
          <button
            onClick={save}
            disabled={pending || !value.trim()}
            className="font-sans text-[12px] text-sage transition-opacity hover:opacity-70 disabled:opacity-30"
          >
            {pending ? "Re-reading…" : "Save"}
          </button>
          <button
            onClick={onDone}
            disabled={pending}
            className="font-sans text-[12px] text-ink-muted transition-colors hover:text-ink-secondary disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="mt-3 border-l-2 border-sage-ring pl-3">
          <p className="prose-question text-[15px] leading-[1.6]">
            Re-reading this, it sounds more like a {suggest.label.toLowerCase()}. Move it?
          </p>
          <div className="mt-1.5 flex items-center gap-4">
            <button
              onClick={confirmMove}
              disabled={pending}
              className="font-sans text-[12px] text-sage transition-opacity hover:opacity-70 disabled:opacity-40"
            >
              {pending ? "Moving…" : `Move to ${suggest.label}`}
            </button>
            <button
              onClick={onDone}
              disabled={pending}
              className="font-sans text-[12px] text-ink-muted transition-colors hover:text-ink-secondary disabled:opacity-40"
            >
              Keep as is
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
