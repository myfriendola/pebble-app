// GET /api/calendar/tasks.ics?token=CALENDAR_TOKEN
// A subscribable iCalendar feed of every dated to-do. Guarded by a token in
// the query string (the gate cookie can't travel with a calendar subscription,
// so this route is excluded from the middleware and the token is its only key).
// Disabled — and invisible, returning 404 — until CALENDAR_TOKEN is set.

import { NextResponse } from "next/server";
import { env, hasCalendar } from "@/lib/env";
import { getTasks } from "@/lib/data";
import { buildTasksIcs } from "@/lib/calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tokenOk(req: Request): boolean {
  if (!hasCalendar) return false;
  const want = env.calendarToken;
  const got = (new URL(req.url).searchParams.get("token") ?? "").trim();
  if (!got || got.length !== want.length) return false;
  // Constant-time-ish compare so the token can't be guessed by timing.
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= got.charCodeAt(i) ^ want.charCodeAt(i);
  return diff === 0;
}

async function handle(req: Request) {
  // 404 (not 401) when the token is wrong or sync is off — don't confirm the
  // feed exists to anyone without the key.
  if (!tokenOk(req)) return new NextResponse("Not found", { status: 404 });

  const { work, life } = await getTasks();
  const ics = buildTasksIcs([...work, ...life]);

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="pebble-todos.ics"',
      // Let the CDN hold it briefly; calendars poll on their own cadence.
      "cache-control": "public, max-age=0, s-maxage=3600",
    },
  });
}

export const GET = handle;
export const HEAD = handle;
