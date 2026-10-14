// GET /api/export[?format=md] — download a complete backup of your Pebble data.
// JSON by default (a full, restorable bundle); Markdown with ?format=md (a
// readable archive). Gated: when APP_PASSWORD is set, a valid unlock cookie is
// required (the middleware also gates this route, but we check here too so a
// direct hit returns a clean 401 rather than the unlock page).

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";
import { GATE_COOKIE, gateEnabled, verifyToken } from "@/lib/gate";
import { collectExport, toMarkdown } from "@/lib/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (gateEnabled()) {
    const token = cookies().get(GATE_COOKIE)?.value;
    if (!(await verifyToken(token))) {
      return NextResponse.json({ error: "locked" }, { status: 401 });
    }
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "database not configured" }, { status: 500 });
  }

  const bundle = await collectExport(supabase);
  const stamp = bundle.exported_at.slice(0, 10);
  const format = new URL(req.url).searchParams.get("format");

  if (format === "md") {
    return new NextResponse(toMarkdown(bundle), {
      status: 200,
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `attachment; filename="pebble-archive-${stamp}.md"`,
        "cache-control": "no-store",
      },
    });
  }

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="pebble-backup-${stamp}.json"`,
      "cache-control": "no-store",
    },
  });
}
