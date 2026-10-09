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
 *
 * It keeps the portal and the files the app is built from, and nothing else.
 * The worker is registered on the staff screens too, because that is where a
 * push is taken, and a church office machine must not end up holding a cached
 * copy of the directory or a giving report for whoever is next at the keyboard.
 */
/* v2 throws away v1, which held whatever screen anybody had opened, staff
   screens included. Activating drops every cache but this one. */
const CACHE = "connectapp-portal-v2";

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

/**
 * What this worker is for: the member's own screens, and the files the
 * installed app is built from. A staff screen is somebody else's data and is
 * never put in this cache.
 */
function mine(url) {
  const path = url.pathname;
  return path === OFFLINE
    || path === "/home"
    || path.startsWith("/home/")
    || path.startsWith("/_next/static/")
    || path === "/manifest.webmanifest"
    || path === "/icon.svg";
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // The station runs its own worker over /checkin and keeps its own cache.
  if (url.pathname.startsWith("/checkin")) return;

  // Everything else goes straight to the network, uncached and untouched.
  if (!mine(url)) return;

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

/**
 * R16.10. A push arriving while the app is closed.
 *
 * The payload carries the words already made, because a worker woken at seven
 * on a Sunday has no session and cannot ask the server what language this
 * person reads.
 */
self.addEventListener("push", (event) => {
  /*
   * A push that arrives in a shape we did not send still reaches the person.
   *
   * The browser requires a notification for every push it delivers, so a
   * handler that gives up on a payload it cannot read has the browser show its
   * own "this site was updated in the background" instead, or count it against
   * the site. Anything unreadable is shown as the church's name with whatever
   * text came with it.
   */
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { title: "ConnectApp", body: event.data.text() };
    }
  }
  if (!payload || typeof payload !== "object") payload = {};
  if (!payload.title) payload.title = "ConnectApp";

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body || "",
      icon: "/icon.svg",
      badge: "/icon.svg",
      // Two of the same thing replace rather than stack, so somebody who left
      // their phone in a drawer comes back to one line rather than nine.
      tag: payload.tag || "connectapp",
      data: { href: payload.href || "/home" },
    }),
  );
});

/** Pressing it opens the screen it is about, in a window that is already open. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href || "/home";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const one of windows) {
        if (one.url.includes(href) && "focus" in one) return one.focus();
      }
      return self.clients.openWindow(href);
    }),
  );
});
