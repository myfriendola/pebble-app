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

export function NotificationsToggle() {
  const [state, setState] = useState<State>("loading");
  const [note, setNote] = useState<string | null>(null);

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
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  async function enable() {
    setState("working");
    setNote(null);
    try {
      const cfg = await fetch("/api/push/key").then((r) => r.json());
      if (!cfg.enabled || !cfg.key) {
        setNote("Notifications aren’t configured yet.");
        setState("off");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
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
      if (!res.ok) throw new Error("store failed");
      setState("on");
      setNote("You’ll hear from Pebble when the day settles.");
    } catch {
      setNote("Couldn’t turn on notifications. Try again.");
      setState("off");
    }
  }

  async function disable() {
    setState("working");
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
    setState("off");
    setNote(null);
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
        This browser doesn’t support notifications.
      </p>
    );
  }
  if (state === "blocked") {
    return (
      <p className="font-sans text-[12px] text-ink-muted">
        Notifications are blocked — turn them on for this site in your browser settings.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {state === "on" ? (
        <>
          <span className="inline-flex items-center gap-2 font-sans text-[12px] text-sage">
            <span className="h-1.5 w-1.5 rounded-full bg-sage-ring2" /> On
          </span>
          <button
            onClick={disable}
            className="font-sans text-[12px] text-ink-muted transition-colors hover:text-ink-secondary"
          >
            Turn off
          </button>
        </>
      ) : (
        <button
          onClick={enable}
          disabled={state === "working"}
          className="rounded-control border border-hairline px-3 py-1.5 font-sans text-[12px] text-ink-secondary transition-colors hover:border-sage-ring hover:text-sage disabled:opacity-50"
        >
          {state === "working" ? "Turning on…" : "Turn on notifications"}
        </button>
      )}
      {note ? <span className="font-sans text-[12px] text-ink-muted">{note}</span> : null}
    </div>
  );
}
