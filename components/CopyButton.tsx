"use client";

import { useState } from "react";

// A quiet "Copy" for taking an entry's words elsewhere. Briefly confirms.
export function CopyButton({
  text,
  className = "font-sans text-[11px] uppercase tracking-label text-ink-muted transition-colors hover:text-sage",
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button onClick={copy} className={className} aria-label="Copy entry">
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
