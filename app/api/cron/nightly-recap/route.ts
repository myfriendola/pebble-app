// POST/GET /api/cron/nightly-recap — a later same-day reflection pass.
// Sweeps any stragglers and refreshes today's reflection ONLY if new notes have
// arrived since the earlier (evening) run. Bearer CRON_SECRET.

import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cronAuth";
import { runNightly } from "@/lib/processing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const report = await runNightly({ skipDailyIfUnchanged: true });
  return NextResponse.json(report, { status: report.ok ? 200 : 500 });
}

export const GET = handle;
export const POST = handle;
