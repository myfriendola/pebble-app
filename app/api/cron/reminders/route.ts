// POST/GET /api/cron/reminders — a morning nudge for to-dos due today.
// Bearer CRON_SECRET.

import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cronAuth";
import { getSupabase } from "@/lib/supabase";
import { sendPush } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: false, reason: "no database" }, { status: 500 });

  const today = new Date().toISOString().slice(0, 10);
  const [w, l] = await Promise.all([
    supabase.from("work_tasks").select("action").eq("due", today).neq("status", "done"),
    supabase.from("life_tasks").select("action").eq("due", today).neq("status", "done"),
  ]);
  const actions = [...(w.data ?? []), ...(l.data ?? [])].map((t) => (t as { action: string }).action);

  let sent = 0;
  if (actions.length > 0) {
    const count = actions.length;
    const body =
      count === 1
        ? actions[0]
        : `${actions[0]} · and ${count - 1} more`;
    const res = await sendPush({
      title: count === 1 ? "A to-do for today" : `${count} to-dos for today`,
      body,
      url: "/tasks",
      tag: "due-today",
    });
    sent = res.sent;
  }

  return NextResponse.json({ ok: true, due: actions.length, sent }, { status: 200 });
}

export const GET = handle;
export const POST = handle;
