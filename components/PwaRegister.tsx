"use client";

import { useEffect } from "react";

// Registers the service worker once the app loads, so the app is installable
// and can receive push notifications.
export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registration is best-effort */
      });
    }
  }, []);
  return null;
}
