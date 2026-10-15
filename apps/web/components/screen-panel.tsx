"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sheet, SheetContent } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R24.6. A screen that is not a sectioned record, over the list it belongs to.
 *
 * MemberPanel carries a section rail and a dirty-form guard because a record
 * is written in it. These screens read, so the panel is the window alone.
 */
/**
 * R24.6. How a screen inside the window closes the window.
 *
 * A window over a screen is a parallel slot, and Next keeps a slot's content
 * alive across a soft navigation, so a link to the address underneath leaves
 * the window standing over it. Closing takes both halves, which only the
 * window itself has. Anything drawn inside it that finishes the job asks for
 * this rather than linking home.
 */
const PanelClose = React.createContext<(() => void) | null>(null);

/** The way out, where this is drawn inside a window. Null anywhere else. */
export const usePanelClose = (): (() => void) | null => React.useContext(PanelClose);

export function ScreenPanel({
  title,
  actions,
  footer,
  width,
  closeTo,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  /** The window's width, where a screen needs more room than the usual one. */
  width?: string;
  /** The list closing lands on. */
  closeTo: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  /*
   * R24.6. The window's own state, so the close square closes it at once.
   *
   * These screens are a parallel slot, and a soft navigation keeps a slot's
   * last content: default.tsx answers a fresh load, nothing else. So moving
   * the address alone left the window standing. Stepping back instead closed
   * it only where nobody had moved around inside it first, which is why a
   * reader who opened the archived shelf had to press close twice.
   */
  const path = usePathname();
  const [open, setOpen] = React.useState(true);

  /*
   * R24.6. Open again whenever the address changes.
   *
   * The window lives in a parallel slot, and Next keeps that slot's component
   * alive across a soft navigation. Closing one set `open` to false, and
   * opening the next record reused the same instance with that false still in
   * it: the address changed, nothing appeared, and a second press on the row
   * was what finally drew it.
   */
  const leaving = React.useRef(false);
  React.useEffect(() => {
    /* Leaving changes the address too, so without this the effect would answer
       the close by opening the window straight back up. */
    if (leaving.current) {
      leaving.current = false;
      return;
    }
    setOpen(true);
  }, [path]);


  const leave = React.useCallback(() => {
    leaving.current = true;
    setOpen(false);
    router.replace(closeTo);
  }, [router, closeTo]);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        leave();
      }}
    >
      <SheetContent
        title={title}
        closeLabel={t("common.close")}
        actions={actions}
        footer={footer}
        layout="centered"
        width={width ?? "880px"}
      >
        <PanelClose.Provider value={leave}>{children}</PanelClose.Provider>
      </SheetContent>
    </Sheet>
  );
}
