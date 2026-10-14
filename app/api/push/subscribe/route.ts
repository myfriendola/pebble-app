import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Store (or refresh) this device's push subscription.
export async function POST(req: Request) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "database" }, { status: 500 });

  let sub: { endpoint?: string } | null = null;
  try {
    sub = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }
  if (!sub?.endpoint) {
    return NextResponse.json({ ok: false, error: "no endpoint" }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ endpoint: sub.endpoint, subscription: sub }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ ok: false, error: "store" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
