// Minimal PWA service worker (Phase 1b scope per docs/DESIGN.md #7: "service
// worker can be minimal (offline page)"). It does exactly one thing: if a
// page navigation fails because the device is offline, serve the cached
// /offline page instead of the browser's default "no internet" screen.
// It does NOT cache videos or any other content - Goloka is an index, not
// an offline media store.
const CACHE_NAME = "goloka-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
  }
});
