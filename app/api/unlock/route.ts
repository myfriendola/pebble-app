// POST /api/unlock — checks the app password and, on success, sets the signed
// unlock cookie (two weeks). Excluded from the gate middleware so it's always
// reachable while locked.

import { NextResponse } from "next/server";
import { GATE_COOKIE, gateEnabled, passwordMatches, issueToken } from "@/lib/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!gateEnabled()) {
    return NextResponse.json({ ok: true, disabled: true }, { status: 200 });
  }

  let password = "";
  try {
    const body = await req.json();
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    /* empty */
  }

  if (!passwordMatches(password)) {
    return NextResponse.json({ ok: false, error: "wrong password" }, { status: 401 });
  }

  const { value, maxAge } = await issueToken();
  const res = NextResponse.json({ ok: true }, { status: 200 });
  res.cookies.set(GATE_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return res;
}
