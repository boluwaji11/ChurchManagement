"use client";

import * as React from "react";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R24.9. What just happened, said once and then gone.
 *
 * An error stays, because it describes something still to be dealt with. A
 * confirmation is the opposite: it answers a press that already worked, and a
 * green bar left on the screen becomes part of the furniture. This puts itself
 * away after five seconds, and carries the cross for anybody who wants it gone
 * sooner.
 */
export function Said({ message, onClose }: { message?: string; onClose: () => void }) {
  const close = React.useRef(onClose);
  close.current = onClose;

  React.useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => close.current(), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  return (
    <Banner
      tone="success"
      title={message}
      onClose={onClose}
      closeLabel={t("common.close")}
    />
  );
}

/**
 * R24.9. The same, for a screen that has no state of its own.
 *
 * A page rendered on the server knows what just happened from its address
 * rather than from a variable, so this holds the one piece of state the
 * confirmation needs: whether it has gone yet.
 */
export function Flash({ message, children }: { message: string; children?: React.ReactNode }) {
  const [shown, setShown] = React.useState(true);
  if (!shown) return null;

  return (
    <Banner
      tone="success"
      title={message}
      onClose={() => setShown(false)}
      closeLabel={t("common.close")}
    >
      {children}
      <Away onDone={() => setShown(false)} />
    </Banner>
  );
}

/** Puts the banner above away after five seconds. */
function Away({ onDone }: { onDone: () => void }) {
  const done = React.useRef(onDone);
  done.current = onDone;

  React.useEffect(() => {
    const timer = window.setTimeout(() => done.current(), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
