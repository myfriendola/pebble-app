"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import type { Domain } from "@/lib/types";
import { toggleTaskDone } from "@/app/actions";

// A soft sage check ring — not a hard checkbox. Optimistic; persists when the
// row is real.
export function CheckRing({
  id,
  domain,
  initialDone = false,
  onChange,
}: {
  id: string;
  domain: Domain;
  initialDone?: boolean;
  onChange?: (done: boolean) => void;
}) {
  const [done, setDone] = useState(initialDone);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !done;
    setDone(next);
    onChange?.(next);
    startTransition(() => {
      void toggleTaskDone(domain, id, next);
    });
  }

  return (
    <button
      onClick={toggle}
      role="checkbox"
      aria-checked={done}
      aria-label={done ? "Mark as not done" : "Mark as done"}
      className={[
        "mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border transition-colors",
        done
          ? "border-sage-ring2 bg-sage-tint text-sage"
          : "border-sage-ring text-transparent hover:border-sage-ring2",
      ].join(" ")}
    >
      <Check size={13} strokeWidth={2} />
    </button>
  );
}
