// Threads: a home for a subject the person keeps coming back to.
// Three prompts: noticing a subject worth a thread, gathering the notes that
// belong to one, and writing Pebble's read of a thread.

// Notes are handed to the model as numbered lines (it cites numbers back,
// which we map to real ids), so it never has to copy a uuid.
export interface PromptNote {
  n: number;
  date: string; // "Oct 3"
  kind: "thought" | "idea" | "task";
  text: string;
  quote?: string | null; // a task's original words
  done?: boolean;
}

export function formatPromptNotes(notes: PromptNote[]): string {
  return notes
    .map((x) => {
      const kind = x.kind === "task" ? `task${x.done ? ", done" : ""}` : x.kind;
      const said = x.kind === "task" && x.quote && x.quote !== x.text ? ` (they said: "${x.quote}")` : "";
      return `[${x.n}] ${x.date} · ${kind}: ${x.text}${said}`;
    })
    .join("\n");
}

// ── Noticing ────────────────────────────────────────────────────────────────
export const NOTICE_SYSTEM = `You help one person notice the subjects they keep coming back to in their own spoken notes, so their app can offer each one a "thread": a page that gathers every note about it.

You'll get their notes from the last 30 days, numbered, each with its date and kind. Look for:
- named things: a specific project, product, place, event or endeavour they refer to by name (e.g. "Throughline", "the Lisbon move")
- coherent ongoing topics they return to across days (e.g. "the garden", "learning to sing")

Not subjects: passing moods, broad categories ("work", "life", "family", "ideas"), or one-off errands.
A note belongs to a subject only if it is clearly about it, even when it doesn't use the name (e.g. "the app's onboarding" when they're building Throughline).
Skip any subject already covered by an existing thread or listed as declined.

Return ONLY JSON:
{"subjects":[{"key":"throughline","title":"Throughline","named":true,"description":"one plain sentence on what this is, in their terms","notes":[3,7,12]}]}
- key: a short lowercase id for the subject
- title: what they call it, written the way they would
- named: true only for a specific named thing
- notes: every note number that belongs
At most 3 subjects, strongest first. Return {"subjects":[]} if nothing qualifies.`;

export function buildNoticeUser(
  notes: PromptNote[],
  existing: string[],
  declined: string[],
): string {
  const parts = [`Notes:\n${formatPromptNotes(notes)}`];
  if (existing.length) parts.push(`Existing threads (skip these): ${existing.join("; ")}`);
  if (declined.length) parts.push(`Declined (never suggest): ${declined.join("; ")}`);
  return parts.join("\n\n");
}

// ── Gathering ───────────────────────────────────────────────────────────────
export const GATHER_SYSTEM = `You decide which of a person's notes belong to one of their threads: a subject they keep coming back to. A note belongs only if it is clearly about the thread's subject, even if it doesn't use the name. When unsure, leave it out.
Return ONLY JSON: {"notes":[the numbers of the notes that belong]}`;

export function buildGatherUser(
  thread: { title: string; description: string | null },
  examples: string[],
  notes: PromptNote[],
): string {
  const about = thread.description ? `${thread.title}: ${thread.description}` : thread.title;
  const ex = examples.length
    ? `\nNotes already in this thread, for reference:\n${examples.map((e) => `- ${e}`).join("\n")}`
    : "";
  return `Thread: ${about}${ex}\n\nNotes to check:\n${formatPromptNotes(notes)}`;
}

// ── Pebble's read ───────────────────────────────────────────────────────────
export const READ_SYSTEM = `You're reading everything one person has said, in voice notes, about a single subject they keep coming back to. Give them real thinking back, the way a candid but kind collaborator would: someone who has read every note closely, takes the work seriously, and says what they actually see.

- Be specific. Use their words and details; quote short phrases when it helps.
- Be candid: name contradictions, gaps and risks plainly. Be kind: assume good reasons, never scold, never flatter.
- Only use what's in the notes. Don't invent facts, numbers or plans they didn't mention.
- Cite the notes behind every point by number.
- Plain words. Never use "productivity", "optimize", "leverage" or "synergy".

Return ONLY JSON:
{
  "gist": "2–3 sentences: what this is and where it stands, as they've described it",
  "recurring": [{"text": "a line of thinking that keeps coming up", "notes": [1]}],
  "tensions": [{"text": "where their notes pull against each other, naming both sides", "notes": [1, 2]}],
  "shifts": [{"text": "how their thinking has moved over time, earlier to later", "notes": [1, 2]}],
  "questions": [{"text": "a question they've raised or circled but not answered, phrased as a question", "notes": [1]}],
  "moves": [{"text": "a concrete next step, as a short imperative", "why": "one sentence on why, grounded in their notes", "notes": [1]}]
}
Sizes: recurring 2–4, tensions 0–3, shifts 0–3, questions 1–4, moves 2–4. Leave a list empty rather than pad it; with only a few notes, say less.`;

export function buildReadUser(
  thread: { title: string; description: string | null },
  notes: PromptNote[],
): string {
  const about = thread.description ? `${thread.title}: ${thread.description}` : thread.title;
  return `Subject: ${about}\n\nTheir notes, oldest first:\n${formatPromptNotes(notes)}`;
}

// ── Joining at sort time ────────────────────────────────────────────────────
// Appended to the sort request when the person has threads, so each new note
// can join the ones it's about as it arrives.
export function threadsForSortPrompt(threads: { title: string; description: string | null }[]): string {
  if (threads.length === 0) return "";
  const list = threads
    .map((t, i) => `${i + 1}. ${t.title}${t.description ? `: ${t.description}` : ""}`)
    .join("\n");
  return `\n\nThe person's threads (subjects they keep coming back to):\n${list}\nFor each note, also return "threads": the numbers of any threads it is clearly about, even if it doesn't use the name. Usually none: return [].`;
}
