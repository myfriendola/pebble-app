// Shared domain types for the Pebble Index app.

export type Domain = "work" | "life";
export type DigestKind = "daily" | "weekly" | "monthly";

export interface Capture {
  id: string;
  transcript: string;
  captured_at: string;
  processed: boolean;
  created_at?: string;
}

export interface Thought {
  id: string;
  text: string;
  themes: string[];
  captured_at: string;
  created_at?: string;
  // Latest gentle question begun on this thought, if any (joined in for the UI).
  noodle?: { prompt: string; reply: string | null } | null;
}

// A spark worth exploring or making later. Themes like a thought, plus an
// optional work/life domain.
export interface Idea {
  id: string;
  text: string;
  themes: string[];
  domain: Domain | null;
  captured_at: string;
  created_at?: string;
  noodle?: { prompt: string; reply: string | null } | null;
}

// What a noodle conversation can hang off of.
export type NoodleKind = "thought" | "idea";

// A theme tag with how often it occurs and which group it belongs to.
export interface ThemeFacet {
  name: string;
  count: number;
  group: string | null;
}

export interface Task {
  id: string;
  action: string;
  source_quote: string | null;
  due: string | null;
  priority: string | null;
  status: string;
  captured_at: string;
  domain: Domain;
}

export interface Digest {
  id: string;
  kind: DigestKind;
  period_date: string;
  narrative: string;
  questions: string[];
  themes: string[];
  needs_review_count: number;
  created_at?: string;
}

export interface ReviewItem {
  id: string;
  capture_id: string | null;
  best_guess: {
    type?: string;
    domain?: string;
    confidence?: number;
    note?: string;
    [key: string]: unknown;
  } | null;
  transcript?: string | null;
  created_at?: string;
}

// The shape the sort prompt returns for a single note.
export interface SortResult {
  type: "task" | "thought" | "idea";
  domain: Domain;
  action?: string | null;
  due?: string | null;
  priority?: "high" | "normal" | null;
  source_quote?: string | null;
  themes?: string[];
  confidence: number;
  // Numbers of the person's threads this note is clearly about (when given).
  threads?: number[];
}

export interface SummaryResult {
  narrative: string;
  questions: string[];
  themes: string[];
}

// ── Threads ─────────────────────────────────────────────────────────────────
// A home for a subject the person keeps coming back to. Notes stay where they
// are (Thoughts / Ideas / Tasks); a thread collects them.

export type ThreadItemKind = "thought" | "idea" | "work_task" | "life_task";

export interface ItemRef {
  kind: ThreadItemKind;
  id: string;
}

// One point in Pebble's read, with the notes it draws on.
export interface ReadPoint {
  text: string;
  why?: string;
  cites: ItemRef[];
}

export interface ThreadRead {
  gist: string;
  recurring: ReadPoint[];
  tensions: ReadPoint[];
  shifts: ReadPoint[];
  questions: ReadPoint[];
  moves: ReadPoint[];
}

export interface Thread {
  id: string;
  title: string;
  description: string | null;
  read: ThreadRead | null;
  read_at: string | null;
  read_item_count: number;
  created_at: string;
}

// A note as it appears on a thread page.
export interface ThreadNote {
  kind: ThreadItemKind;
  id: string;
  text: string;
  quote: string | null; // a task's original spoken words
  themes: string[];
  status: string | null; // tasks only
  captured_at: string;
}

export interface ThreadSummary {
  id: string;
  title: string;
  description: string | null;
  noteCount: number;
  taskCount: number;
  lastAddedAt: string | null;
  created_at: string;
}

export interface ThreadSuggestion {
  id: string;
  title: string;
  description: string | null;
  note_count: number;
  first_at: string | null;
  kinds: { thoughts: number; ideas: number; tasks: number };
  previews: string[];
  queued: number; // more questions waiting after this one
}
