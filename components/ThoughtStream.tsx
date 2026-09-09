import type { Thought } from "@/lib/types";
import { ThoughtRow } from "./ThoughtRow";
import { Whisper } from "./ui";

// A plain, hairline-separated stream of thoughts. Grouping (by day/theme) is
// done by the caller; this just renders the list.
export function ThoughtStream({
  thoughts,
  showThemes = true,
  empty = "Nothing spoken yet. When a thought surfaces, it will rest here.",
}: {
  thoughts: Thought[];
  showThemes?: boolean;
  empty?: string;
}) {
  if (thoughts.length === 0) return <Whisper>{empty}</Whisper>;

  return (
    <div className="divide-y divide-hairline">
      {thoughts.map((t) => (
        <ThoughtRow key={t.id} thought={t} showThemes={showThemes} />
      ))}
    </div>
  );
}
