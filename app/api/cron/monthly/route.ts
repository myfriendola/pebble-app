// POST/GET /api/cron/monthly — the wider month reflection. Bearer CRON_SECRET.

import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cronAuth";
import { runMonthly } from "@/lib/processing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const report = await runMonthly();
  return NextResponse.json(report, { status: report.ok ? 200 : 500 });
}

export const GET = handle;
export const POST = handle;
