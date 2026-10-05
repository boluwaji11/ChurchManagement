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
