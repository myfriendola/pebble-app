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
- For thoughts and ideas: themes (1–2 short lowercase tags). Reuse an exact tag
  from the "existing tags" list whenever one fits, rather than coining a
  near-duplicate (e.g. don't invent "experimentation" when "experiments" exists).
  Only coin a new tag for a genuinely new topic. Prefer broad, reusable tags.
- For ideas: also keep domain ("work"|"life") when it's clear
- confidence: 0.0–1.0 for type + domain
Return ONLY a JSON array, one object per note, no prose.`;

// Build the user message for a batch of note transcripts, optionally priming the
// model with the tags already in use so it reuses them instead of inventing
// near-duplicates.
export function buildSortUser(transcripts: string[], vocabulary?: string[]): string {
  const notes = transcripts.map((t, i) => `${i + 1}. ${t}`).join("\n");
  const vocab =
    vocabulary && vocabulary.length > 0
      ? `\n\nExisting tags (reuse an exact match whenever one fits):\n${vocabulary.join(", ")}`
      : "";
  return `Notes:\n${notes}${vocab}`;
}
