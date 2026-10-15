"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useOverlay } from "@/components/shell/use-overlay";

/** Where the pointer sits relative to the control it is naming. */
type Side = "left" | "right" | "above" | "below";

interface Spot {
  top: number;
  left: number;
  width: number;
  height: number;
  side: Side;
}

/** How far the arrow stands off the control. */
const GAP = 12;
/** Up to three seconds of looking for a control that is still streaming in. */
const PATIENCE = 3000;

/**
 * R22.1, R22.3. The guide reaches onto the screen and points at the control.
 *
 * Telling somebody the answer is on this screen and leaving them to find it is
 * most of the way to telling them nothing: a volunteer who has never seen the
 * product does not know that Pair a station is the thing in the corner. So the
 * step names a control, the control carries `data-guide` with that name, and
 * this draws a ring round it and an arrow at it, from outside the screen's own
 * markup so no screen has to know the guide exists.
 *
 * It points and stops there. Nothing is dimmed, nothing is blocked, and the
 * control underneath works the whole time: a church that would rather do
 * something else first is not being held by the wrist. It gets out of the way
 * while a panel is open, it follows the control through a scroll or a resize,
 * and it goes the moment the step is answered.
 */
export function Point({ target }: { target: string | null }) {
  const pathname = usePathname();
  const covered = useOverlay();
  const [spot, setSpot] = React.useState<Spot | null>(null);

  React.useEffect(() => {
    if (!target || covered) {
      setSpot(null);
      return;
    }

    let frame = 0;
    let stop = false;
    const since = Date.now();

    const place = (found: Element) => {
      const box = found.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) return setSpot(null);

      /*
       * Off the screen's edge is not a place to draw an arrow, so the mark
       * stands down until a scroll brings the control back.
       */
      const inView =
        box.bottom > 8 && box.top < window.innerHeight - 8
        && box.right > 8 && box.left < window.innerWidth - 8;
      if (!inView) return setSpot(null);

      /*
       * The side with room for it, preferring the left, because the guide is
       * down the right and an arrow between the two reads as coming from it.
       */
      const side: Side =
        box.left > 96 ? "left"
        : window.innerWidth - box.right > 96 ? "right"
        : box.top > 72 ? "above"
        : "below";

      setSpot({ top: box.top, left: box.left, width: box.width, height: box.height, side });
    };

    const look = () => {
      if (stop) return;
      const found = document.querySelector(`[data-guide="${CSS.escape(target)}"]`);
      if (found) {
        place(found);
        return;
      }
      setSpot(null);
      // The screen may still be streaming. Keep looking, briefly.
      if (Date.now() - since < PATIENCE) frame = requestAnimationFrame(look);
    };

    look();

    /*
     * Once it is found, its box is watched rather than polled: a row opening
     * above it, a window resized, a panel closing underneath all move it, and
     * none of them is a scroll event.
     */
    const watch = () => {
      const found = document.querySelector(`[data-guide="${CSS.escape(target)}"]`);
      if (found) place(found);
      else setSpot(null);
    };

    const size = new ResizeObserver(watch);
    size.observe(document.body);
    const tree = new MutationObserver(watch);
    tree.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", watch, true);
    window.addEventListener("resize", watch);

    return () => {
      stop = true;
      cancelAnimationFrame(frame);
      size.disconnect();
      tree.disconnect();
      window.removeEventListener("scroll", watch, true);
      window.removeEventListener("resize", watch);
    };
  }, [target, covered, pathname]);

  if (!spot) return null;

  const ring = {
    top: `${spot.top - 5}px`,
    left: `${spot.left - 5}px`,
    width: `${spot.width + 10}px`,
    height: `${spot.height + 10}px`,
  };

  // Where the arrow sits, and which way it faces.
  const arrow =
    spot.side === "left"
      ? { top: `${spot.top + spot.height / 2 - 11}px`, left: `${spot.left - GAP - 22}px`, turn: "-90deg" }
      : spot.side === "right"
        ? { top: `${spot.top + spot.height / 2 - 11}px`, left: `${spot.left + spot.width + GAP}px`, turn: "90deg" }
        : spot.side === "above"
          ? { top: `${spot.top - GAP - 22}px`, left: `${spot.left + spot.width / 2 - 11}px`, turn: "180deg" }
          : { top: `${spot.top + spot.height + GAP}px`, left: `${spot.left + spot.width / 2 - 11}px`, turn: "0deg" };

  return (
    /*
     * Nothing here takes a press. The control underneath is the thing being
     * pointed at and it has to stay pressable, so the whole layer is inert and
     * the words belong to the guide rather than to this.
     */
    <div aria-hidden className="pointer-events-none fixed inset-0 z-30">
      <span data-guide-ring className="absolute rounded-[12px]" style={ring} />
      <span
        data-guide-arrow
        className="absolute grid size-[22px] place-items-center"
        style={{ ...arrow, ["--turn" as string]: arrow.turn }}
      >
        <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" aria-hidden>
          <path
            d="M12 4v13M6.5 11.5 12 17l5.5-5.5"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}
