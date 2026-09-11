// Gate the app behind the password. Runs on page routes (see matcher); the
// capture webhook, cron jobs, and the unlock endpoint are excluded so they keep
// working while locked. When no APP_PASSWORD is set the gate is a no-op.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { GATE_COOKIE, gateEnabled, verifyToken } from "@/lib/gate";

export async function middleware(req: NextRequest) {
  if (!gateEnabled()) return NextResponse.next();

  const token = req.cookies.get(GATE_COOKIE)?.value;
  if (await verifyToken(token)) return NextResponse.next();

  // Locked: navigations render the lock screen in place (URL unchanged);
  // anything else (server actions, /api/noodle) is refused.
  if (req.method === "GET") {
    const url = req.nextUrl.clone();
    url.pathname = "/unlock";
    url.search = "";
    return NextResponse.rewrite(url);
  }
  return NextResponse.json({ error: "locked" }, { status: 401 });
}

export const config = {
  // Everything except Next internals, static assets, and the always-open routes
  // (the unlock page + endpoint, the ring webhook, and the cron jobs).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|unlock|api/unlock|api/capture|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)$).*)",
  ],
};
