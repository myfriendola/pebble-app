"use client";

import { useEffect, useState } from "react";

function urlBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

type State = "loading" | "unsupported" | "ios-install" | "blocked" | "off" | "on" | "working";
type Prefs = { reflection: boolean; reminders: boolean };
const DEFAULT_PREFS: Prefs = { reflection: true, reminders: true };

const TYPE_ROWS: { key: keyof Prefs; label: string; hint: string }[] = [
  { key: "reflection", label: "Daily reflection", hint: "when the evening reflection has settled" },
  { key: "reminders", label: "To-dos due today", hint: "a gentle morning count of what's due" },
];

export function NotificationsToggle() {
  const [state, setState] = useState<State>("loading");
  const [note, setNote] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const supported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

    if (!supported) {
      const ua = navigator.userAgent;
      const isIOS = /iphone|ipad|ipod/i.test(ua);
      const standalone =
        (window.navigator as { standalone?: boolean }).standalone === true ||
        window.matchMedia("(display-mode: standalone)").matches;
      setState(isIOS && !standalone ? "ios-install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("blocked");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then(async (sub) => {
        if (!sub) {
          setState("off");
          return;
        }
        setEndpoint(sub.endpoint);
        try {
          const { prefs: p } = await fetch(
            `/api/push/prefs?endpoint=${encodeURIComponent(sub.endpoint)}`,
          ).then((r) => r.json());
          if (p) setPrefs({ ...DEFAULT_PREFS, ...p });
        } catch {
          /* keep defaults */
        }
        setState("on");
      })
      .catch(() => setState("off"));
  }, []);

  async function enable() {
    setState("working");
    setNote(null);
    try {
      // Ask permission first, while we still hold the tap's user activation —
      // iOS drops it across a network await, which silently blocks the prompt.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        if (permission === "default") setNote("Permission wasn't granted — tap to try again.");
        return;
      }

      const cfg = await fetch("/api/push/key").then((r) => r.json());
      if (!cfg.enabled || !cfg.key) {
        setNote("Notifications aren't configured on the server yet (VAPID keys).");
        setState("off");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(cfg.key),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error("Couldn't save the subscription.");

      setEndpoint(sub.endpoint);
      setPrefs(DEFAULT_PREFS);
      setState("on");
      setNote("You're set. Send a test below to be sure.");
    } catch (e) {
      setNote(`Couldn't turn on notifications. ${(e as Error)?.message ?? ""}`.trim());
      setState("off");
    }
  }

  async function disable() {
    setState("working");
    setNote(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
    } catch {
      /* ignore */
    }
    setEndpoint(null);
    setState("off");
  }

  async function setType(key: keyof Prefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    if (!endpoint) return;
    try {
      await fetch("/api/push/prefs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint, prefs: next }),
      });
    } catch {
      /* best-effort; UI already reflects intent */
    }
  }

  async function sendTest() {
    setTesting(true);
    setNote(null);
    try {
      const r = await fetch("/api/push/test", { method: "POST" }).then((res) => res.json());
      if (r.ok) setNote("Sent — it should appear in a moment.");
      else if (r.reason) setNote(r.reason);
      else if (r.targeted === 0) setNote("No subscribed devices found — try turning it off and on.");
      else setNote(`Couldn't deliver (sent ${r.sent}/${r.targeted}${r.errors ? `, ${r.errors} errored` : ""}).`);
    } catch {
      setNote("Test failed to send. Try again.");
    }
    setTesting(false);
  }

  if (state === "loading") return null;

  if (state === "ios-install") {
    return (
      <p className="font-sans text-[12px] leading-[1.6] text-ink-muted">
        To get notifications on iPhone, first add Pebble to your Home Screen (Share → Add to Home
        Screen), then open it from there and come back here.
      </p>
    );
  }
  if (state === "unsupported") {
    return (
      <p className="font-sans text-[12px] text-ink-muted">
        This browser doesn&rsquo;t support notifications.
      </p>
    );
  }
  if (state === "blocked") {
    return (
      <p className="font-sans text-[12px] text-ink-muted">
        Notifications are blocked — turn them on for this site in your browser settings, then
        refresh.
      </p>
    );
  }

  if (state === "on") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 font-sans text-[12px] text-sage">
            <span className="h-1.5 w-1.5 rounded-full bg-sage-ring2" /> On
          </span>
          <button
            onClick={disable}
            className="font-sans text-[12px] text-ink-muted transition-colors hover:text-ink-secondary"
          >
            Turn off
          </button>
        </div>

        <div className="space-y-2.5">
          {TYPE_ROWS.map((row) => (
            <label key={row.key} className="flex cursor-pointer items-start gap-3">
              <Switch on={prefs[row.key]} onChange={(v) => setType(row.key, v)} label={row.label} />
              <span className="leading-tight">
                <span className="block font-sans text-[13px] text-ink-secondary">{row.label}</span>
                <span className="block font-sans text-[11px] text-ink-muted">{row.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={sendTest}
            disabled={testing}
            className="font-sans text-[12px] text-ink-muted underline-offset-2 transition-colors hover:text-sage hover:underline disabled:opacity-50"
          >
            {testing ? "Sending…" : "Send a test notification"}
          </button>
          {note ? <span className="font-sans text-[12px] text-ink-muted">{note}</span> : null}
        </div>
      </div>
    );
  }

  // state === "off" | "working"
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={enable}
        disabled={state === "working"}
        className="rounded-control border border-hairline px-3 py-1.5 font-sans text-[12px] text-ink-secondary transition-colors hover:border-sage-ring hover:text-sage disabled:opacity-50"
      >
        {state === "working" ? "Turning on…" : "Turn on notifications"}
      </button>
      {note ? <span className="font-sans text-[12px] text-ink-muted">{note}</span> : null}
    </div>
  );
}

function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={[
        "relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors",
        on ? "border-sage-ring bg-sage-tint" : "border-hairline bg-panel",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all",
          on ? "left-[18px] bg-sage" : "left-0.5 bg-ink-muted",
        ].join(" ")}
      />
    </button>
  );
}
