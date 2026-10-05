/**
 * R17.11. The service worker behind the installed portal.
 *
 * A member installs this on a phone and opens it in a car park, in a church
 * hall, on a train. Without a worker, a tap with no signal gets the browser's
 * own error page, which for an installed app reads as the app being broken.
 *
 * Network first, so somebody on a good connection is never reading last
 * week's rota. Cache second, so somebody on none is reading something. Only
 * GET requests: accepting a serving request is a POST, and a POST answered out
 * of a cache would be an answer the church never received.
 */
const CACHE = "connectapp-portal-v1";

/** The screen shown when there is nothing cached and nothing to fetch. */
const OFFLINE = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE])).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // The station runs its own worker over /checkin and keeps its own cache.
  if (url.pathname.startsWith("/checkin")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const hit = await caches.match(request, { ignoreSearch: false });
        if (hit) return hit;

        // The same screen for a different church, or with a filter on it, is
        // still that screen, and reading it is better than reading an error.
        const loose = await caches.match(request, { ignoreSearch: true });
        if (loose) return loose;

        if (request.mode === "navigate") {
          const shell = await caches.match(OFFLINE);
          if (shell) return shell;
        }

        return new Response("", { status: 504, statusText: "Offline" });
      }),
  );
});
