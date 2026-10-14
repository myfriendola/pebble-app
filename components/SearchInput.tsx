"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// A calm search field. Submitting navigates to /search?q=…, so results are a
// normal server render (shareable, back-button friendly).
export function SearchInput({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = q.trim();
        router.push(t ? `/search?q=${encodeURIComponent(t)}` : "/search");
      }}
      role="search"
      className="mb-10"
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search in your own words…"
        aria-label="Search your thoughts, ideas, and tasks"
        autoFocus
        className="w-full border-0 border-b border-hairline bg-transparent pb-2 font-serif text-[20px] text-ink outline-none transition-colors placeholder:text-ink-muted/70 focus:border-sage-ring"
      />
    </form>
  );
}
