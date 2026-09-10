// POST /api/capture — receives transcriptions from the Pebble ring's webhook.
// Guarded by a shared secret in the query string (?secret=CAPTURE_SECRET).
// Inserts a raw capture and returns 200 quickly; the nightly job sorts it later.

import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { env, hasSupabase, hasOpenAI } from "@/lib/env";
import { sortAndFileCapture } from "@/lib/processing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Pull the transcription text out of whatever shape the webhook sends.
function extractTranscript(payload: unknown): string | null {
  if (typeof payload === "string") return payload.trim() || null;
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;

  const candidates = [
    p.transcription,
    p.transcript,
    p.text,
    p.content,
    p.message,
    (p.data as Record<string, unknown> | undefined)?.transcription,
    (p.data as Record<string, unknown> | undefined)?.text,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

function extractTimestamp(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    const candidates = [p.captured_at, p.timestamp, p.created_at, p.time, p.date];
    for (const c of candidates) {
      if (typeof c === "string" || typeof c === "number") {
        const d = new Date(c);
        if (!Number.isNaN(d.getTime())) return d.toISOString();
      }
    }
  }
  return new Date().toISOString();
}

// Shared secret check for the ?secret= query param. Returns an error response
// to send back, or null when the secret is valid.
function checkSecret(req: Request): NextResponse | null {
  if (!env.captureSecret) {
    return NextResponse.json(
      { ok: false, error: "CAPTURE_SECRET is not set on this deployment" },
      { status: 500 },
    );
  }
  const provided = (new URL(req.url).searchParams.get("secret") ?? "").trim();
  if (provided !== env.captureSecret) {
    return NextResponse.json(
      { ok: false, error: "secret did not match CAPTURE_SECRET" },
      { status: 401 },
    );
  }
  return null;
}

// GET is a browser-testable health check: visit
//   https://<app>/api/capture?secret=YOUR_SECRET
// and you'll see plainly whether the secret matches. It never writes anything.
export async function GET(req: Request) {
  const denied = checkSecret(req);
  if (denied) return denied;

  // Secret-gated diagnostic: which config the deployment found, and whether a
  // live read of `captures` works — so the exact DB reason is visible in a
  // browser without needing the ring. Reveals no secret values.
  const diagnostics: Record<string, unknown> = {
    ok: true,
    ready: true,
    supabaseConfigured: hasSupabase,
    supabaseUrlFrom: process.env.SUPABASE_URL
      ? "SUPABASE_URL"
      : process.env.NEXT_PUBLIC_SUPABASE_URL
        ? "NEXT_PUBLIC_SUPABASE_URL"
        : "none",
    serverKeyFrom: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? "SUPABASE_SERVICE_ROLE_KEY"
      : process.env.SUPABASE_SECRET_KEY
        ? "SUPABASE_SECRET_KEY"
        : "none",
    openaiConfigured: hasOpenAI,
  };

  const supabase = getSupabase();
  if (!supabase) {
    diagnostics.database = {
      ok: false,
      reason: "no Supabase URL/key found in this deployment's environment",
    };
    return NextResponse.json(diagnostics, { status: 200 });
  }

  try {
    const { count, error } = await supabase
      .from("captures")
      .select("*", { count: "exact", head: true });
    diagnostics.database = error
      ? { ok: false, detail: error.message, code: error.code, hint: error.hint }
      : { ok: true, capturesRows: count };
  } catch (e) {
    diagnostics.database = { ok: false, detail: String(e) };
  }

  return NextResponse.json(diagnostics, { status: 200 });
}

export async function POST(req: Request) {
  const denied = checkSecret(req);
  if (denied) return denied;

  // Parse the body leniently (JSON, form, or plain text).
  let payload: unknown = null;
  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      payload = await req.json();
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const form = await req.formData();
      payload = Object.fromEntries(form.entries());
    } else {
      const text = await req.text();
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }
  } catch {
    payload = null;
  }

  const transcript = extractTranscript(payload);
  if (!transcript) {
    return NextResponse.json({ error: "no transcription found in payload" }, { status: 400 });
  }
  const captured_at = extractTimestamp(payload);

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "database not configured" }, { status: 500 });
  }

  let inserted: { id: string; transcript: string; captured_at: string } | null = null;
  try {
    const { data, error } = await supabase
      .from("captures")
      .insert({ transcript, captured_at, processed: false })
      .select("id, transcript, captured_at")
      .single();

    if (error) {
      // Surface the real Postgres/PostgREST reason so the ring's "Recent runs"
      // shows exactly what's wrong (e.g. missing table, bad key) rather than a
      // generic message. Only callers who already hold CAPTURE_SECRET see this.
      console.error("capture insert failed:", error);
      return NextResponse.json(
        {
          ok: false,
          error: "could not store capture",
          detail: error.message,
          code: error.code,
          hint: error.hint,
        },
        { status: 500 },
      );
    }
    inserted = data as { id: string; transcript: string; captured_at: string };
  } catch (e) {
    console.error("capture insert threw:", e);
    return NextResponse.json(
      { ok: false, error: "could not store capture", detail: String(e) },
      { status: 500 },
    );
  }

  // Sort-on-capture: file this note right away so it appears on the right
  // screen within seconds. Best-effort — if it fails, the note stays saved
  // (processed = false) and the nightly sweep will sort it. The daily
  // reflection is still written on the evening schedule, not here.
  let sorted = false;
  if (inserted && hasOpenAI) {
    try {
      const r = await sortAndFileCapture(supabase, inserted);
      sorted = r.ok;
    } catch (e) {
      console.error("sort-on-capture failed:", e);
    }
  }

  return NextResponse.json({ ok: true, sorted }, { status: 200 });
}
