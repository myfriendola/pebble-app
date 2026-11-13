// Web Push sending. Uses VAPID keys from env; a no-op when they're unset.

import webpush from "web-push";
import { getSupabase } from "./supabase";
import type { FiledItem } from "./processing";

const PUBLIC = (process.env.VAPID_PUBLIC_KEY ?? "").trim();
const PRIVATE = (process.env.VAPID_PRIVATE_KEY ?? "").trim();
const SUBJECT = (process.env.VAPID_SUBJECT ?? "mailto:pebble@localhost").trim();

// The kinds of notification a device can opt into, independently.
export type NotifType = "reflection" | "reminders" | "arrivals";
export const NOTIF_TYPES: NotifType[] = ["reflection", "reminders", "arrivals"];
export const DEFAULT_PREFS: Record<NotifType, boolean> = {
  reflection: true,
  reminders: true,
  arrivals: true,
};

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
  // "arrival" lets the service worker fold several into one ("3 notes landed")
  // and stay quiet while the app is already open.
  kind?: "arrival";
}

// The tag every arrival notification shares, so new ones replace the last
// instead of piling up. The app clears it once you open Pebble.
export const ARRIVAL_TAG = "pebble-arrival";

// A quiet receipt for a note that just came in from the ring, saying where it
// went in the same words the app uses for that place.
export function arrivalNotice(transcript: string, filed: FiledItem[] = []): PushPayload {
  const first = filed[0];
  let title = "Your note landed";
  let body = transcript;
  if (first?.kind === "task") {
    title = `On your ${first.domain ?? "life"} list`;
    body = first.text + (first.due ? ` \u00b7 due ${formatDue(first.due)}` : "");
  } else if (first?.kind === "thought") {
    title = "Kept as a thought";
  } else if (first?.kind === "idea") {
    title = "Saved as a spark";
  } else if (first?.kind === "review") {
    title = "Not sure where this one goes";
  }
  return { title, body: clip(body, 140), url: "/", tag: ARRIVAL_TAG, kind: "arrival" };
}

function clip(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:]+$/, "")}\u2026`;
}

// "2026-11-14" → "Sat, Nov 14". A due date has no time, so read it as UTC.
function formatDue(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
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
