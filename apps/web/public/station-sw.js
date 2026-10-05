/**
 * R8.21, R8.22. The service worker a check-in station runs.
 *
 * Without it, a station that loses the network loses the screen: a reload, a
 * tablet waking up, or a tap on the labels window gets the browser's own error
 * page, and the volunteer is left holding a queue and nothing to type into.
 *
 * Network first, so an online station is never looking at yesterday's build.
 * Cache second, so an offline one is looking at something.
 *
 * It takes GET requests only. A check-in is a POST, and a POST that quietly
 * came out of a cache would be a check-in that never happened.
 */
const CACHE = "connectapp-station-v1";

self.addEventListener("install", () => self.skipWaiting());

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

        // A query string the station has not printed before still belongs to a
        // page it has, so the shell answers and reads what it holds locally.
        const loose = await caches.match(request, { ignoreSearch: true });
        if (loose) return loose;

        return new Response("", { status: 504, statusText: "Offline" });
      }),
  );
});
