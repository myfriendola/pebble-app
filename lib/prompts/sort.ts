// 4a. sort.ts — classify each capture.
// Based on the build guide (Part 4a), extended with a third type, "idea", so
// sparks get their own home alongside tasks and thoughts. The rest of the
// wording is kept faithful to the original.

export const SORT_SYSTEM = `You sort a person's spoken brain-dump notes. For each note, decide:
- type: "task" if it's something to do; "idea" if it's a spark worth exploring or
  making later (a proposal, a "what if", something to create, build, or try);
  else "thought" (a reflection or observation, not actionable and not a proposal)
- domain: "work" (professional) or "life" (personal)
- For tasks: action (a short clear rewrite of what to do), due (ISO date or null),
  priority ("high"|"normal"|null), source_quote (the person's original wording)
- For thoughts: themes (1–3 short lowercase tags, reused when a topic recurs —
  e.g. "reading again", "launch nerves")
- For ideas: themes (1–3 short lowercase tags), and keep domain ("work"|"life")
  when it's clear
- confidence: 0.0–1.0 for type + domain
Return ONLY a JSON array, one object per note, no prose.`;

// Build the user message for a batch of note transcripts.
export function buildSortUser(transcripts: string[]): string {
  const notes = transcripts.map((t, i) => `${i + 1}. ${t}`).join("\n");
  return `Notes:\n${notes}`;
}
