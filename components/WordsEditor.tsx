"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { addWord, fixWordInPastNotes, removeWord } from "@/app/settings/actions";

export interface WordRow {
  id: string;
  word: string;
  heard_as: string[];
  pastCount: number;
}

// Names your ring tends to mishear. Each is corrected as new notes arrive, and
// past notes can be fixed with one tap.
export function WordsEditor({ initial, missing }: { initial: WordRow[]; missing: boolean }) {
  const [rows, setRows] = useState(initial);
  const [word, setWord] = useState("");
  const [heard, setHeard] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [fixed, setFixed] = useState<Record<string, number>>({});
  const [pending, start] = useTransition();

  if (missing) {
    return (
      <p className="font-sans text-[12px] leading-[1.6] text-ink-muted">
        Needs one SQL step: in Supabase, run the <b>Words Pebble should know</b> section at the end of{" "}
        <code className="font-mono text-[11px]">migration.sql</code>.
      </p>
    );
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    setNote(null);
    start(async () => {
      const r = await addWord(word, heard);
      if (!r.ok) {
        setNote(r.error ?? "Couldn't save that just now.");
        return;
      }
      const w = word.trim();
      const variants = heard.split(",").map((v) => v.trim()).filter(Boolean);
      setRows((prev) => [
        ...prev.filter((p) => p.word.toLowerCase() !== w.toLowerCase()),
        { id: r.id ?? w, word: w, heard_as: variants, pastCount: r.pastCount ?? 0 },
      ]);
      setWord("");
      setHeard("");
      setNote(`New notes will say ${w}.`);
    });
  }

  return (
    <div className="space-y-4">
      {rows.length > 0 ? (
        <ul className="divide-y divide-hairline border-y border-hairline">
          {rows.map((r) => (
            <WordItem
              key={r.id}
              row={r}
              fixedCount={fixed[r.id]}
              onFixed={(n) => setFixed((f) => ({ ...f, [r.id]: n }))}
              onRemoved={() => setRows((prev) => prev.filter((p) => p.id !== r.id))}
            />
          ))}
        </ul>
      ) : null}

      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <label className="min-w-[8rem] flex-1">
          <span className="label mb-1 block">Word</span>
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="e.g. Neimo"
            className="w-full rounded-control border border-hairline bg-paper px-3 py-1.5 font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted/70 focus:border-sage-ring"
          />
        </label>
        <label className="min-w-[10rem] flex-[1.4]">
          <span className="label mb-1 block">Often heard as</span>
          <input
            value={heard}
            onChange={(e) => setHeard(e.target.value)}
            placeholder="e.g. Nemo, Nimo"
            className="w-full rounded-control border border-hairline bg-paper px-3 py-1.5 font-sans text-[14px] text-ink outline-none placeholder:text-ink-muted/70 focus:border-sage-ring"
          />
        </label>
        <button
          type="submit"
          disabled={pending || !word.trim() || !heard.trim()}
          className="rounded-full border border-hairline px-4 py-1.5 font-sans text-[12px] text-ink-secondary transition-colors hover:border-sage-ring hover:text-sage disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </form>
      {note ? <p className="font-sans text-[12px] text-ink-muted">{note}</p> : null}
    </div>
  );
}

function WordItem({
  row,
  fixedCount,
  onFixed,
  onRemoved,
}: {
  row: WordRow;
  fixedCount?: number;
  onFixed: (n: number) => void;
  onRemoved: () => void;
}) {
  const [pending, start] = useTransition();

  return (
    <li className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="font-serif text-[16px] text-ink">{row.word}</div>
        <div className="mt-0.5 font-sans text-[12px] text-ink-muted">heard as {row.heard_as.join(", ")}</div>
      </div>
      <div className="flex items-center gap-3 pt-0.5">
        {fixedCount !== undefined ? (
          <span className="font-sans text-[12px] text-ink-muted">
            Fixed {fixedCount} note{fixedCount === 1 ? "" : "s"}
          </span>
        ) : row.pastCount > 0 ? (
          <button
            onClick={() =>
              start(async () => {
                const { fixed } = await fixWordInPastNotes(row.id);
                onFixed(fixed);
              })
            }
            disabled={pending}
            className="font-sans text-[12px] text-sage transition-opacity hover:opacity-70 disabled:opacity-50"
          >
            {pending ? "Fixing…" : `Fix ${row.pastCount} past note${row.pastCount === 1 ? "" : "s"}`}
          </button>
        ) : null}
        <button
          onClick={() =>
            start(async () => {
              await removeWord(row.id);
              onRemoved();
            })
          }
          aria-label={`Stop correcting ${row.word}`}
          title="Remove"
          className="-m-1 p-1 text-ink-muted transition-colors hover:text-clay"
        >
          <X size={14} strokeWidth={1.6} />
        </button>
      </div>
    </li>
  );
}

