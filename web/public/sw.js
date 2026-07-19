// Minimal PWA service worker: if a page navigation fails because the device
// is offline, serve the cached /offline page instead of the browser's
// default "no internet" screen. It does NOT cache videos or any other
// content - Goloka is an index, not an offline media store.
//
// v2 (2026-07-18), two production bugs fixed:
// 1. The offline page was cached once at install and never refreshed, so
//    it showed the site as it looked months ago. It now re-caches on every
//    activation (each deploy ships a byte-different sw.js, which triggers
//    the update cycle), and old caches are deleted.
// 2. fetch(event.request) can REJECT for a navigation that arrives through
//    a redirect chain (e.g. returning from Google OAuth) even though the
//    network is fine - Chromium's redirect-mode quirk - which made sign-in
//    land on the offline page. A failed navigation is now retried as a
//    fresh same-URL request (redirect: follow) before concluding
//    "offline".
//
// v3 (2026-07-19): adds the "push" and "notificationclick" handlers for
// opt-in, anonymous web push (lib/push.ts, worker/sync.py's send_push) -
// festival reminders and live-darshan alerts. Nothing about the offline
// handling above changed; the cache name only bumps because any
// byte-different sw.js is what makes the browser install the update.
const CACHE_NAME = "goloka-v3";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
      // Refresh the offline page so it always matches the current design.
      const cache = await caches.open(CACHE_NAME);
      await cache.add(OFFLINE_URL).catch(() => {});
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate" || event.request.method !== "GET") return;
  event.respondWith(
    (async () => {
      try {
        return await fetch(event.request);
      } catch {
        try {
          // Redirect-chain navigations (OAuth returns) can make the replay
          // above throw while the network is healthy - a fresh request for
          // the same URL follows redirects normally.
          return await fetch(event.request.url, { credentials: "same-origin" });
        } catch {
          return (await caches.match(OFFLINE_URL)) ?? Response.error();
        }
      }
    })()
  );
});

// Web push (v3): worker/sync.py's send_push() posts a JSON payload
// {title, body, url, tag} through pywebpush - never anything identifying
// (see db/schema.sql's push_subscriptions comment). `tag` lets a duplicate
// send (e.g. a re-run) replace rather than stack a second notification.
// A malformed/empty payload still shows a generic notification rather than
// silently doing nothing, which the Push API's own spec effectively
// requires (browsers may revoke a subscription that goes quiet on push).
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const title = payload.title || "Goloka";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.tag,
    data: { url: payload.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Focuses an already-open Goloka tab on the target page rather than
// stacking a new one, falling back to opening a fresh tab/window.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        try {
          if (new URL(client.url).pathname === url && "focus" in client) {
            return client.focus();
          }
        } catch {
          // malformed client.url - fall through to openWindow below.
        }
      }
      return clients.openWindow(url);
    })()
  );
});
