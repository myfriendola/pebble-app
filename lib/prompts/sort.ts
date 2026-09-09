// 4a. sort.ts — classify each capture.
// The system prompt below is the EXACT text from the build guide (Part 4a).
// Do not edit the wording — it is the soul of the sort step.

export const SORT_SYSTEM = `You sort a person's spoken brain-dump notes. For each note, decide:
- type: "task" if it's something to do, else "thought"
- domain: "work" (professional) or "life" (personal)
- For tasks: action (a short clear rewrite of what to do), due (ISO date or null),
  priority ("high"|"normal"|null), source_quote (the person's original wording)
- For thoughts: themes (1–3 short lowercase tags, reused when a topic recurs —
  e.g. "reading again", "launch nerves")
- confidence: 0.0–1.0 for type + domain
Return ONLY a JSON array, one object per note, no prose.`;

// Build the user message for a batch of note transcripts.
export function buildSortUser(transcripts: string[]): string {
  const notes = transcripts.map((t, i) => `${i + 1}. ${t}`).join("\n");
  return `Notes:\n${notes}`;
}
