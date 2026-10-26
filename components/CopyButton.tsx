"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

// A quiet copy icon for taking an entry's words elsewhere. Flips to a check
// briefly on success.
export function CopyButton({ text }: { text: string }) {
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
    <button
      onClick={copy}
      aria-label={copied ? "Copied" : "Copy entry"}
      title="Copy"
      className="-m-1 p-1 text-ink-muted transition-colors hover:text-sage"
    >
      {copied ? (
        <Check size={15} strokeWidth={1.8} className="text-sage" />
      ) : (
        <Copy size={15} strokeWidth={1.5} />
      )}
    </button>
  );
}
