// The app "password" gate. Not a full auth system — a single shared password
// that unlocks the app for two weeks per device, enforced server-side by a
// signed, httpOnly cookie. Isomorphic: uses only Web Crypto + process.env, so
// it runs in both Edge middleware and Node route handlers.

export const GATE_COOKIE = "pebble_gate";
const TTL_SECONDS = 14 * 24 * 60 * 60; // two weeks

export function gatePassword(): string {
  return (process.env.APP_PASSWORD ?? "").trim();
}

// When no password is configured, the gate is off (so a fresh deploy can't lock
// you out before you've set it).
export function gateEnabled(): boolean {
  return gatePassword().length > 0;
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(gatePassword()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return b64url(new Uint8Array(sig));
}

// Constant-time-ish comparison for equal-length strings.
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function passwordMatches(input: string): boolean {
  const pw = gatePassword();
  return pw.length > 0 && safeEqual(input, pw);
}

// Token = "<expiry-ms>.<hmac(expiry)>". The HMAC is keyed by the password, so
// changing APP_PASSWORD invalidates every outstanding token (re-locks all
// devices), and the token never reveals the password.
export async function issueToken(): Promise<{ value: string; maxAge: number }> {
  const exp = String(Date.now() + TTL_SECONDS * 1000);
  const sig = await sign(exp);
  return { value: `${exp}.${sig}`, maxAge: TTL_SECONDS };
}

export async function verifyToken(token: string | undefined | null): Promise<boolean> {
  if (!gateEnabled() || !token) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await sign(exp);
  if (!safeEqual(sig, expected)) return false;
  const expMs = Number(exp);
  return Number.isFinite(expMs) && expMs > Date.now();
}
