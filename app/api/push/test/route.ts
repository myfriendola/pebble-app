// POST /api/push/test — send a one-off test notification to every subscribed
// device, so delivery can be verified on demand (not just at the scheduled
// times). Gated by the app's unlock cookie via middleware. Returns a small
// diagnostic so a silent failure is legible.

import { NextResponse } from "next/server";
import { pushEnabled, sendPush } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!pushEnabled()) {
    return NextResponse.json(
      { ok: false, reason: "Push isn't configured (VAPID keys are missing on this deployment)." },
      { status: 200 },
    );
  }

  const { sent, targeted, errors } = await sendPush({
    title: "Pebble is listening",
    body: "This is a test — notifications are working.",
    url: "/",
    tag: "pebble-test",
  });

  return NextResponse.json({ ok: sent > 0, sent, targeted, errors }, { status: 200 });
}
