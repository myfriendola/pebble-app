import OpenAI from "openai";
import { env, hasOpenAI } from "./env";

let cached: OpenAI | null = null;

export function getOpenAI(): OpenAI | null {
  if (!hasOpenAI) return null;
  if (cached) return cached;
  cached = new OpenAI({ apiKey: env.openaiApiKey });
  return cached;
}

// Strip stray ```json ... ``` fences the model sometimes wraps around output,
// even in JSON mode — a belt-and-braces safeguard before JSON.parse.
export function stripFences(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  return s.trim();
}

export function parseJsonLoose<T = unknown>(raw: string): T {
  return JSON.parse(stripFences(raw)) as T;
}

// One call → parsed JSON. Uses OpenAI JSON mode; the prompts all instruct the
// model to return only JSON. Returns null when OpenAI isn't configured.
export async function chatJson<T = unknown>(
  system: string,
  user: string,
  opts: { temperature?: number } = {},
): Promise<T | null> {
  const client = getOpenAI();
  if (!client) return null;

  const res = await client.chat.completions.create({
    model: env.openaiModel,
    temperature: opts.temperature ?? 0.6,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const raw = res.choices[0]?.message?.content ?? "";
  return parseJsonLoose<T>(raw);
}
