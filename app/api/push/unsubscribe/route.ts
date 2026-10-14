import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Remove this device's push subscription.
export async function POST(req: Request) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 500 });
  let body: { endpoint?: string } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (body?.endpoint) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", body.endpoint);
  }
  return NextResponse.json({ ok: true });
}
