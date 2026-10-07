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
