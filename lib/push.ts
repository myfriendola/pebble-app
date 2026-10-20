// Web Push sending. Uses VAPID keys from env; a no-op when they're unset.

import webpush from "web-push";
import { getSupabase } from "./supabase";

const PUBLIC = (process.env.VAPID_PUBLIC_KEY ?? "").trim();
const PRIVATE = (process.env.VAPID_PRIVATE_KEY ?? "").trim();
const SUBJECT = (process.env.VAPID_SUBJECT ?? "mailto:pebble@localhost").trim();

// The kinds of notification a device can opt into, independently.
export type NotifType = "reflection" | "reminders";
export const DEFAULT_PREFS: Record<NotifType, boolean> = { reflection: true, reminders: true };

export function pushEnabled(): boolean {
  return Boolean(PUBLIC && PRIVATE);
}
export function vapidPublicKey(): string {
  return PUBLIC;
}

let configured = false;
function ensureConfigured() {
  if (configured || !pushEnabled()) return;
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

// A device gets a typed notification unless it has explicitly opted that type
// out (missing prefs → opted in, so older subscriptions keep working).
function wants(prefs: unknown, type?: NotifType): boolean {
  if (!type) return true;
  const p = prefs as Partial<Record<NotifType, boolean>> | null | undefined;
  return p?.[type] !== false;
}

// Send to every subscribed device that wants this type; prune ones the browser
// has expired (404/410). Returns how many were targeted and actually sent, so
// callers (e.g. the test route) can report delivery.
export async function sendPush(
  payload: PushPayload,
  opts: { type?: NotifType } = {},
): Promise<{ sent: number; targeted: number; errors: number }> {
  const supabase = getSupabase();
  if (!supabase || !pushEnabled()) return { sent: 0, targeted: 0, errors: 0 };
  ensureConfigured();

  // Prefer prefs-aware selection; fall back when the column isn't there yet
  // (deploy landed before the migration), treating every device as opted in.
  let data: Record<string, unknown>[] | null = (
    await supabase.from("push_subscriptions").select("endpoint, subscription, prefs")
  ).data;
  if (!data) {
    data = (await supabase.from("push_subscriptions").select("endpoint, subscription")).data;
  }
  let sent = 0;
  let targeted = 0;
  let errors = 0;
  for (const row of data ?? []) {
    const r = row as {
      endpoint: string;
      subscription: webpush.PushSubscription;
      prefs?: Record<string, boolean> | null;
    };
    if (!wants(r.prefs, opts.type)) continue;
    targeted += 1;
    try {
      await webpush.sendNotification(r.subscription, JSON.stringify(payload));
      sent += 1;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", r.endpoint);
      } else {
        errors += 1;
      }
    }
  }
  return { sent, targeted, errors };
}
