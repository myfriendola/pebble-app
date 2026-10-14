// Web Push sending. Uses VAPID keys from env; a no-op when they're unset.

import webpush from "web-push";
import { getSupabase } from "./supabase";

const PUBLIC = (process.env.VAPID_PUBLIC_KEY ?? "").trim();
const PRIVATE = (process.env.VAPID_PRIVATE_KEY ?? "").trim();
const SUBJECT = (process.env.VAPID_SUBJECT ?? "mailto:pebble@localhost").trim();

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

// Send a notification to every stored subscription; prune ones the browser has
// expired (404/410).
export async function sendPush(payload: PushPayload): Promise<{ sent: number }> {
  const supabase = getSupabase();
  if (!supabase || !pushEnabled()) return { sent: 0 };
  ensureConfigured();

  const { data } = await supabase.from("push_subscriptions").select("endpoint, subscription");
  let sent = 0;
  for (const row of data ?? []) {
    const r = row as { endpoint: string; subscription: webpush.PushSubscription };
    try {
      await webpush.sendNotification(r.subscription, JSON.stringify(payload));
      sent += 1;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", r.endpoint);
      }
    }
  }
  return { sent };
}
