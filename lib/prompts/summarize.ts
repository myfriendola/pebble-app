// 4b. summarize.ts — write a reflection.
// The system prompt below is the EXACT text from the build guide (Part 4b).
// Weekly (Sundays) and monthly (the 1st) reuse the same shape over a wider
// window, asking for the arc: what recurred, what shifted, what faded.

import type { DigestKind } from "../types";

export const SUMMARIZE_SYSTEM = `You write a short, calm daily reflection for one person, from their thoughts and
tasks today. Voice: warm, plain, unhurried — like a thoughtful friend, never a
productivity coach. Notice what recurred and what sits underneath the busy stuff.
Return ONLY JSON:
{
  "narrative": "2–3 sentences on where their head was today",
  "questions": ["1–2 gentle questions to sit with, second person"],
  "themes": ["the day's threads as short lowercase tags"]
}
Do not give advice or to-dos. Do not use the words "productivity" or "optimize".`;

interface SummarizeInput {
  kind: DigestKind;
  thoughts: { text: string; themes: string[]; captured_at: string }[];
  tasks: { action: string; source_quote: string | null; domain: string }[];
}

const WINDOW_FRAMING: Record<DigestKind, string> = {
  daily: "This is today's reflection.",
  weekly:
    "This is a WEEKLY reflection over the past 7 days. Widen the lens: notice the arc — what recurred, what shifted, what faded. Keep the same JSON shape and calm voice.",
  monthly:
    "This is a MONTHLY reflection over the past ~30 days. Step back further: the shape of the month — what recurred, what shifted, what faded. Keep the same JSON shape and calm voice.",
};

// Assemble the user content the model reflects on. The system prompt stays
// exactly as written; the window framing is added here for weekly/monthly.
export function buildSummarizeUser({ kind, thoughts, tasks }: SummarizeInput): string {
  const thoughtLines =
    thoughts.length > 0
      ? thoughts
          .map((t) => `- ${t.text}${t.themes.length ? `  [${t.themes.join(", ")}]` : ""}`)
          .join("\n")
      : "- (none)";

  const taskLines =
    tasks.length > 0
      ? tasks
          .map((t) => `- (${t.domain}) ${t.action}${t.source_quote ? ` — "${t.source_quote}"` : ""}`)
          .join("\n")
      : "- (none)";

  return `${WINDOW_FRAMING[kind]}

Thoughts:
${thoughtLines}

Tasks:
${taskLines}`;
}
