// GET /api/pulse — a tiny "has anything changed?" check for the open app.
// Returns a fingerprint of the newest captures (and whether each has been
// sorted) plus the review-queue size. The client polls it while the app is
// visible and refreshes the screen only when the fingerprint moves, so a note
// spoken into the ring appears without a manual reload.
//
// Behind the password gate like every page (see middleware.ts). Reveals no
// note text, only ids and flags.

import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A sort normally settles in a few seconds; while a note younger than this is
// still unsorted, the client checks back quickly to catch it landing.
const FRESH_MS = 90_000;

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ v: "none", latest: null, settling: false }, noStore);
  }

  try {
    const [captures, review] = await Promise.all([
      supabase
        .from("captures")
        .select("id, processed, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase.from("review_queue").select("id", { count: "exact", head: true }),
    ]);
    const rows = (captures.data ?? []) as { id: string; processed: boolean; created_at: string }[];
    const now = Date.now();

    const v =
      rows.map((r) => `${r.id.slice(0, 8)}${r.processed ? "+" : "-"}`).join(".") +
      `|${review.count ?? 0}`;
    const settling = rows.some(
      (r) => !r.processed && now - new Date(r.created_at).getTime() < FRESH_MS,
    );

    return NextResponse.json({ v, latest: rows[0]?.id ?? null, settling }, noStore);
  } catch {
    return NextResponse.json({ v: null, latest: null, settling: false }, noStore);
  }
}

const noStore = { headers: { "Cache-Control": "no-store, max-age=0" } };
