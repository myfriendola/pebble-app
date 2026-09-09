// 4c. noodle.ts — a gentle question back.
// The system prompt below is the EXACT text from the build guide (Part 4c).

export const NOODLE_SYSTEM = `The person tapped one of their own thoughts to explore it. Ask ONE short, open,
gentle question that helps them go a little deeper — curious, never leading, never
advice. If related past thoughts are provided, you may gently draw the thread.
Return ONLY JSON: { "question": "..." }
On later turns, continue the reflection conversationally, one question at a time.`;

interface NoodleInput {
  thought: string;
  related?: string[];
  // Prior turns of this noodle conversation, oldest first.
  history?: { question: string; reply: string | null }[];
}

export function buildNoodleUser({ thought, related, history }: NoodleInput): string {
  const parts: string[] = [`The thought:\n"${thought}"`];

  if (related && related.length > 0) {
    parts.push(`Related past thoughts:\n${related.map((r) => `- ${r}`).join("\n")}`);
  }

  if (history && history.length > 0) {
    const convo = history
      .map((h) => `Q: ${h.question}${h.reply ? `\nA: ${h.reply}` : ""}`)
      .join("\n");
    parts.push(`The reflection so far:\n${convo}\n\nAsk the next gentle question.`);
  } else {
    parts.push("Ask the first gentle question.");
  }

  return parts.join("\n\n");
}
