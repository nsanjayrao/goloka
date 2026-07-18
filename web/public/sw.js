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
const CACHE_NAME = "goloka-v2";
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
