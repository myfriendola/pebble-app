import { NextResponse } from "next/server";
import { vapidPublicKey, pushEnabled } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The public VAPID key the browser needs to subscribe (not secret).
export async function GET() {
  return NextResponse.json({ enabled: pushEnabled(), key: vapidPublicKey() });
}
