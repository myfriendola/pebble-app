// POST/GET /api/cron/nightly — the end-of-day pass. Bearer CRON_SECRET.
// Vercel Cron fires this with a GET; we accept POST too (per the spec / manual
// triggering).

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
  const report = await runNightly();
  return NextResponse.json(report, { status: report.ok ? 200 : 500 });
}

export const GET = handle;
export const POST = handle;
