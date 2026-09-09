"use client";

import { useState, useTransition } from "react";
import { processNow } from "@/app/actions";
import type { PipelineReport } from "@/lib/processing";

// A quiet dev affordance to run the whole nightly pipeline from the browser,
// so the pipeline is testable with no terminal. Uses a server action, so the
// CRON_SECRET is never exposed to the client.
export function ProcessNowButton() {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  function run() {
    setNote(null);
    startTransition(async () => {
      try {
        const r: PipelineReport = await processNow();
        if (!r.ok) {
          setNote(r.reason ?? "Couldn't process just now.");
        } else if ((r.processed ?? 0) === 0) {
          setNote("Nothing new to sort — reflection refreshed.");
        } else {
          setNote(
            `Sorted ${r.committed ?? 0}${r.review ? `, ${r.review} to review` : ""}. Reflection written.`,
          );
        }
      } catch {
        setNote("Couldn't process just now.");
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={run}
        disabled={pending}
        className="rounded-control border border-hairline px-3 py-1.5 font-sans text-[12px] text-ink-secondary transition-colors hover:border-sage-ring hover:text-sage disabled:opacity-50"
      >
        {pending ? "Processing…" : "Process now"}
      </button>
      {note ? <span className="font-sans text-[12px] text-ink-muted">{note}</span> : null}
    </div>
  );
}
