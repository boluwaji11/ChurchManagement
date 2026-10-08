"use client";

import * as React from "react";

/**
 * Where a panel hanging off a control goes.
 *
 * Two problems, one answer. A date field near the bottom of the window drops
 * its calendar past the fold, and a field inside a dialog has the dialog's own
 * box to escape. The panel is positioned against the window rather than the
 * control, so nothing between it and the viewport can crop it, and it is placed
 * wherever it fits whole: under the control, over it, or shifted up the screen
 * until the last row is on screen.
 *
 * Measured when it opens and again on any scroll or resize, because what it is
 * measured against is the window.
 */
export function useDrop(
  open: boolean,
  anchor: React.RefObject<HTMLElement | null>,
  wanted: { height: number; width?: number },
): React.CSSProperties {
  const [style, setStyle] = React.useState<React.CSSProperties>({ visibility: "hidden" });

  React.useLayoutEffect(() => {
    if (!open) {
      setStyle({ visibility: "hidden" });
      return;
    }

    const measure = () => {
      const box = anchor.current?.getBoundingClientRect();
      if (!box) return;

      const gap = 4;
      const edge = 8;
      /*
       * R24.6. A calendar asks for 304px, which is wider than the room a
       * narrow phone has once both edges are kept clear. Narrowed to what
       * there is, so the last column is reachable rather than off the glass.
       */
      const width = Math.min(wanted.width ?? box.width, window.innerWidth - edge * 2);
      const height = Math.min(wanted.height, window.innerHeight - edge * 2);

      const below = window.innerHeight - box.bottom - gap - edge;
      const above = box.top - gap - edge;

      let top: number;
      if (height <= below) top = box.bottom + gap;
      else if (height <= above) top = box.top - gap - height;
      // Neither side holds it whole, so it sits as low as it can while its
      // last row is still on screen.
      else top = Math.max(edge, window.innerHeight - edge - height);

      const left = Math.min(Math.max(edge, box.left), window.innerWidth - edge - width);

      setStyle({ position: "fixed", top, left, width, maxHeight: height });
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, anchor, wanted.height, wanted.width]);

  return style;
}
