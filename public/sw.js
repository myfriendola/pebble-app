// Pebble service worker — installable app, push notifications, and a calm
// offline shell. Pages you've already opened come back when you're offline, and
// static assets load instantly from cache. Your data is never stored beyond
// what the browser already fetched; /api/ is always live.

const CACHE = "pebble-v2";
const PRECACHE = [
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:png|jpe?g|gif|webp|svg|ico|woff2?|ttf)$/.test(url.pathname)
  );
}

function offlineFallback() {
  return new Response(
    "<!doctype html><meta charset=utf-8>" +
      "<meta name=viewport content='width=device-width,initial-scale=1'>" +
      "<title>Pebble — offline</title>" +
      "<body style='margin:0;display:grid;place-items:center;height:100vh;background:#F5F1EA;" +
      "color:#5F5E5A;font-family:ui-serif,Georgia,serif'>" +
      "<div style='text-align:center;padding:2rem'>" +
      "<div style='font-size:20px;color:#2C2C2A'>You’re offline</div>" +
      "<div style='margin-top:8px;font-size:14px'>Pebble will be here when you’re back.</div>" +
      "</div>",
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // never cache mutations
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // only our own origin
  if (url.pathname.startsWith("/api/")) return; // push / capture / calendar — always live

  // Full-page navigations: network-first (always fresh when online), with the
  // last-seen page — or a gentle offline card — as the fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return resp;
        })
        .catch(() =>
          caches
            .match(req)
            .then((hit) => hit || caches.match("/"))
            .then((hit) => hit || offlineFallback()),
        ),
    );
    return;
  }

  // Immutable static assets: cache-first (hashed filenames never change).
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((resp) => {
            const copy = resp.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
            return resp;
          }),
      ),
    );
    return;
  }

  // Everything else (e.g. RSC payloads): network, falling back to cache.
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});

// WebKit (iPhone and iPad home-screen apps, Safari) revokes a push
// subscription if a push ever arrives without a notification being shown, so
// there we always show one. Other browsers may stay quiet while the app is
// already open and focused.
const UA = (self.navigator && self.navigator.userAgent) || "";
const MUST_SHOW = /AppleWebKit/.test(UA) && !/Chrome|Chromium|Android/.test(UA);

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data && event.data.text ? event.data.text() : "" };
  }
  event.waitUntil(showPush(data));
});

async function showPush(data) {
  let title = data.title || "Pebble";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag,
    data: { url: data.url || "/" },
  };

  // A note just came in from the ring.
  if (data.kind === "arrival") {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // Any open Pebble refreshes now rather than at its next check.
    for (const w of windows) w.postMessage({ type: "pebble:arrival" });
    // Already looking at the app? The ripple says it; skip the banner.
    const watching = windows.some((w) => w.visibilityState === "visible" && w.focused);
    if (watching && !MUST_SHOW) return;

    // Fold into the one already showing ("3 notes landed") instead of piling
    // up. Same tag, so it replaces quietly: only the first one buzzes.
    let count = 1;
    try {
      const shown = await self.registration.getNotifications({ tag: data.tag });
      for (const n of shown) count = Math.max(count, ((n.data && n.data.count) || 1) + 1);
    } catch (e) {
      /* getNotifications unsupported: show it on its own */
    }
    options.data.count = count;
    if (count > 1) {
      options.body = `${title} \u00b7 ${options.body}`;
      title = `${count} notes landed`;
    }
  }

  return self.registration.showNotification(title, options);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
