"use client";

import * as React from "react";

/**
 * R17.11. Registering the worker that keeps the installed app answering.
 *
 * Rendered once by the portal's frame. The station has its own worker over
 * /checkin and keeps its own cache, and this one leaves those requests alone.
 */
export function Installed() {
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/portal-sw.js", { scope: "/" }).catch(() => {
      // A browser that refuses it still gets the app, just not offline.
    });
  }, []);

  return null;
}

/**
 * R17.11. Adding the church to a home screen.
 *
 * Shown only where the browser has offered it, which is the only honest way to
 * draw it: an install button that explains why it did nothing is worse than no
 * button. iOS offers no event, and Safari puts Add to Home Screen in its own
 * share menu, so there is nothing here for us to draw.
 */
export function useInstall(): (() => void) | null {
  const held = React.useRef<Event & { prompt?: () => void }>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const offered = (event: Event) => {
      event.preventDefault();
      held.current = event as Event & { prompt?: () => void };
      setReady(true);
    };
    const done = () => setReady(false);

    window.addEventListener("beforeinstallprompt", offered);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", offered);
      window.removeEventListener("appinstalled", done);
    };
  }, []);

  if (!ready) return null;
  return () => {
    held.current?.prompt?.();
    setReady(false);
  };
}

/**
 * R16.10, R17.11. Saying yes to notifications, and taking it back.
 *
 * Returns null where the browser cannot do it at all, so the menu draws
 * nothing rather than a control that explains itself. Where it can, the state
 * is read from the subscription this browser already holds rather than from
 * the permission alone: somebody who said yes on their laptop has not said yes
 * on their phone.
 */
export function usePush(church: string): {
  on: boolean;
  busy: boolean;
  toggle: () => void;
} | null {
  const [ready, setReady] = React.useState(false);
  const [on, setOn] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  /*
   * R17.11. On is what the church can actually reach, rather than what this
   * browser happens to hold.
   *
   * A browser keeps its subscription across sessions, so it can hold one the
   * church has no row for: a save that failed, or a row dropped when a send
   * came back 404. Reading the browser alone made the control say notifications
   * were on while nothing could reach this machine. Where the two disagree the
   * subscription is written again, which is the one thing that puts it right.
   */
  React.useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setReady(true);
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) { setOn(false); return; }

        const { known, subscribe } = await import("@/app/home/push-actions");
        if (await known(sub.endpoint, church)) { setOn(true); return; }

        const json = sub.toJSON() as { keys?: { p256dh?: string; auth?: string } };
        if (!json.keys?.p256dh || !json.keys.auth) { setOn(false); return; }
        const result = await subscribe(
          {
            endpoint: sub.endpoint,
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
            userAgent: navigator.userAgent,
          },
          church,
        );
        setOn(!result.error);
      } catch {
        setOn(false);
      }
    })();
  }, [church]);

  if (!ready) return null;

  const toggle = () => {
    setBusy(true);
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();

        if (existing) {
          const { unsubscribe } = await import("@/app/home/push-actions");
          await unsubscribe(existing.endpoint, church);
          await existing.unsubscribe();
          setOn(false);
          return;
        }

        if ((await Notification.requestPermission()) !== "granted") return;

        const { publicKey, subscribe } = await import("@/app/home/push-actions");
        const key = await publicKey();
        if (!key) return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: fromBase64Url(key),
        });
        const json = sub.toJSON() as { keys?: { p256dh?: string; auth?: string } };
        if (!json.keys?.p256dh || !json.keys.auth) return;

        /* R17.11. The church's answer decides, not the press. A control that
           says it is on while the save was refused is a church waiting for
           notifications that can never arrive. */
        const result = await subscribe(
          {
            endpoint: sub.endpoint,
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
            userAgent: navigator.userAgent,
          },
          church,
        );
        setOn(!result.error);
      } finally {
        setBusy(false);
      }
    })();
  };

  return { on, busy, toggle };
}

/** The VAPID key travels as base64url text and subscribes as bytes. */
function fromBase64Url(value: string): ArrayBuffer {
  const padded = (value + "=".repeat((4 - (value.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}
