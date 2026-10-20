// Read or update a device's notification preferences (which types it wants).
// GET ?endpoint=… → { prefs }; POST { endpoint, prefs } → merge + save.

import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { DEFAULT_PREFS, type NotifType } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: NotifType[] = ["reflection", "reminders"];

function clean(input: unknown): Record<NotifType, boolean> {
  const p = (input ?? {}) as Record<string, unknown>;
  const out = { ...DEFAULT_PREFS };
  for (const t of TYPES) if (typeof p[t] === "boolean") out[t] = p[t] as boolean;
  return out;
}

export async function GET(req: Request) {
  const supabase = getSupabase();
  const endpoint = new URL(req.url).searchParams.get("endpoint");
  if (!supabase || !endpoint) return NextResponse.json({ prefs: DEFAULT_PREFS });
  const { data } = await supabase
    .from("push_subscriptions")
    .select("prefs")
    .eq("endpoint", endpoint)
    .maybeSingle();
  return NextResponse.json({ prefs: clean((data as { prefs?: unknown } | null)?.prefs) });
}

export async function POST(req: Request) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "database" }, { status: 500 });

  let body: { endpoint?: string; prefs?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }
  if (!body.endpoint) return NextResponse.json({ ok: false, error: "no endpoint" }, { status: 400 });

  const prefs = clean(body.prefs);
  const { error } = await supabase
    .from("push_subscriptions")
    .update({ prefs })
    .eq("endpoint", body.endpoint);
  if (error) return NextResponse.json({ ok: false, error: "store" }, { status: 500 });

  return NextResponse.json({ ok: true, prefs });
}
