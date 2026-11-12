"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Keeps the open app in step with the ring. While the app is visible it asks
// /api/pulse whether anything has arrived or finished sorting, and refreshes
// the screen only when the answer changes. It checks right away whenever the
// app comes back to the foreground (the usual moment: you've just spoken into
// the ring and you open Pebble), quickly while a note is mid-sort, and only
// occasionally otherwise. Hidden tabs never poll.
//
// A brand-new note also fires a "pebble:arrival" window event, which the top
// bar answers with a small ripple.

const IDLE_MS = 8_000;
const SETTLING_MS = 2_500;
const LOCKED_MS = 60_000;

export function LiveRefresh() {
  const router = useRouter();
  const lastV = useRef<string | null>(null);
  const lastLatest = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    let alive = true;

    const schedule = (ms: number) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(check, ms);
    };

    async function check() {
      if (!alive || document.visibilityState !== "visible" || inFlight.current) return;
      inFlight.current = true;
      let next = IDLE_MS;
      try {
        const res = await fetch("/api/pulse", { cache: "no-store" });
        // While the app is locked the gate answers with the unlock page, not JSON.
        if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) {
          next = LOCKED_MS;
          return;
        }
        const data = (await res.json()) as {
          v: string | null;
          latest: string | null;
          settling: boolean;
        };
        if (!data.v) return;

        if (lastV.current !== null && data.v !== lastV.current) {
          router.refresh();
          if (data.latest && data.latest !== lastLatest.current) {
            window.dispatchEvent(new CustomEvent("pebble:arrival"));
          }
        }
        lastV.current = data.v;
        lastLatest.current = data.latest;
        if (data.settling) next = SETTLING_MS;
      } catch {
        /* offline or a blip: try again later */
      } finally {
        inFlight.current = false;
        if (alive && document.visibilityState === "visible") schedule(next);
      }
    }

    const wake = () => {
      if (document.visibilityState === "visible") {
        void check();
      } else if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };

    void check();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    window.addEventListener("online", wake);
    window.addEventListener("pageshow", wake);
    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
      window.removeEventListener("online", wake);
      window.removeEventListener("pageshow", wake);
    };
  }, [router]);

  return null;
}
