// POST /api/capture — receives transcriptions from the Pebble ring's webhook.
// Guarded by a shared secret in the query string (?secret=CAPTURE_SECRET).
// Inserts a raw capture and returns 200 quickly; the nightly job sorts it later.

import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  return NextResponse.json(
    { ok: true, ready: true, message: "Capture endpoint is ready — the ring can POST here." },
    { status: 200 },
  );
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

  const { error } = await supabase
    .from("captures")
    .insert({ transcript, captured_at, processed: false });

  if (error) {
    return NextResponse.json({ error: "could not store capture" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
