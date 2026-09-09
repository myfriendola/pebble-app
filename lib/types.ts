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
  type: "task" | "thought";
  domain: Domain;
  action?: string | null;
  due?: string | null;
  priority?: "high" | "normal" | null;
  source_quote?: string | null;
  themes?: string[];
  confidence: number;
}

export interface SummaryResult {
  narrative: string;
  questions: string[];
  themes: string[];
}
