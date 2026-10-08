"use client";

import { useLinkStatus } from "next/link";
import { Spinner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R24.6. The link you just pressed, while the screen behind it is built.
 *
 * A screen in this product is rendered on the server, so pressing a nav item
 * leaves the old screen on the glass for as long as the database takes. With
 * nothing moving, the reader presses it again. This sits inside the link and
 * marks the one that is opening.
 *
 * It draws nothing for the first moment: a screen that answers quickly should
 * flash no spinner at all.
 */
export function Opening({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return (
    <Spinner
      label={t("common.opening")}
      className={`ml-1.5 opacity-0 [animation:connectapp-fade_var(--duration-fast)_var(--ease-out)_200ms_forwards] ${className ?? ""}`}
    />
  );
}
