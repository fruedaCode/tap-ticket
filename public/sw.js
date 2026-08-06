// Bump CACHE_NAME on each deploy to invalidate old caches
const CACHE_NAME = "tapticket-v1";

const MAX_CACHE_ENTRIES = 50;

// Only safe-to-precache assets: the proxy redirects unauthenticated
// navigations, so HTML pages must be cached at runtime, not at install time.
const APP_SHELL = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Pass through anything cross-origin or under /api/ untouched.
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  // Navigations: network-first, fall back to the cache when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) =>
              cache.keys().then((keys) => {
                if (keys.length > MAX_CACHE_ENTRIES) {
                  cache.delete(keys[0]);
                }
                return cache.put(request, copy);
              }),
            );
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const shell = await caches.match("/tickets");
          return (
            shell ||
            new Response("Offline", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        }),
    );
    return;
  }

  // Static assets: cache-first with runtime caching.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
