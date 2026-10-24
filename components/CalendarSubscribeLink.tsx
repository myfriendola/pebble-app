"use client";

import { useState } from "react";

// The tap-to-subscribe link (webcal:// opens the calendar app's subscribe
// flow) plus a quiet "copy link" for calendars that take a pasted URL instead.
export function CalendarSubscribeLink({
  webcalUrl,
  httpsUrl,
}: {
  webcalUrl: string;
  httpsUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(httpsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — the webcal link still works */
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={webcalUrl}
          className="rounded-full border border-hairline px-4 py-1.5 font-sans text-[12px] text-ink-secondary transition-colors hover:border-sage-ring hover:text-sage"
        >
          Subscribe in your calendar
        </a>
        <button
          onClick={copy}
          className="font-sans text-[12px] text-ink-muted transition-colors hover:text-ink-secondary"
        >
          {copied ? "Link copied" : "Copy link"}
        </button>
      </div>
      <p className="font-sans text-[12px] leading-[1.6] text-ink-muted">
        Subscribe once; to-dos with a date appear in your calendar and keep themselves up to date.
      </p>
    </div>
  );
}
