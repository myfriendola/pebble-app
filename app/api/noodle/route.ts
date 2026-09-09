// POST /api/noodle — the gentle question back when a thought is tapped.
// Generates one open question via the noodle prompt, persists it (best-effort),
// and optionally saves the user's reply. Degrades gracefully with no OpenAI /
// no Supabase so the inline noodle always works in preview.

import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { chatJson } from "@/lib/openai";
import { hasOpenAI } from "@/lib/env";
import { NOODLE_SYSTEM, buildNoodleUser } from "@/lib/prompts/noodle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A soft fallback when OpenAI isn't configured, so the block never sits blank.
const FALLBACKS = [
  "What's underneath this one, if you sit with it a moment?",
  "What would it look like to give this a little more room?",
  "Where have you felt this before?",
  "What's the quietest true thing you could say about it?",
];
function fallbackQuestion(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h + ch.charCodeAt(0)) % FALLBACKS.length;
  return FALLBACKS[h];
}

export async function POST(req: Request) {
  let body: {
    thoughtId?: string;
    thoughtText?: string;
    related?: string[];
    history?: { question: string; reply: string | null }[];
    reply?: string;
    priorQuestion?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const thoughtText = (body.thoughtText ?? "").trim();
  if (!thoughtText) {
    return NextResponse.json({ error: "thoughtText required" }, { status: 400 });
  }

  const supabase = getSupabase();
  const canPersist = supabase && body.thoughtId && UUID_RE.test(body.thoughtId);

  // Save the user's reply against the question it answered (best-effort).
  if (canPersist && body.reply && body.reply.trim() && body.priorQuestion) {
    try {
      await supabase!
        .from("noodles")
        .update({ reply: body.reply.trim() })
        .eq("thought_id", body.thoughtId!)
        .eq("prompt", body.priorQuestion);
    } catch {
      /* ignore — reply persistence is non-critical */
    }
  }

  // Generate the next gentle question.
  let question = fallbackQuestion(thoughtText);
  if (hasOpenAI) {
    try {
      const result = await chatJson<{ question?: string }>(
        NOODLE_SYSTEM,
        buildNoodleUser({
          thought: thoughtText,
          related: body.related,
          history: body.history,
        }),
        { temperature: 0.8 },
      );
      if (result?.question && result.question.trim()) question = result.question.trim();
    } catch {
      /* keep fallback */
    }
  }

  // Persist the new question as an open turn (best-effort).
  if (canPersist) {
    try {
      await supabase!.from("noodles").insert({ thought_id: body.thoughtId!, prompt: question });
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({ question }, { status: 200 });
}
