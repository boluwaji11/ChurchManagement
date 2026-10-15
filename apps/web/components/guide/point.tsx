"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/** Which side of the control the card sits on. */
type Side = "left" | "right" | "above" | "below";

interface Spot {
  top: number;
  left: number;
  width: number;
  height: number;
  side: Side;
  /** Where the beak sits along the card's edge, in px from its start. */
  beak: number;
}

/** How far the card stands off the control. */
const GAP = 14;
/** The card's own width, and the breathing room it keeps from the window. */
const CARD = 300;
const MARGIN = 12;
/** How much of a control has to be on screen before it is worth pointing at. */
const EDGE = 8;
/** Up to three seconds of looking for a control that is still streaming in. */
const PATIENCE = 3000;

/**
 * R22.1, R22.3. The guide's instruction, on the work rather than beside it.
 *
 * Telling somebody the answer is on this screen and leaving them to find it is
 * most of the way to telling them nothing: a volunteer who has never seen the
 * product does not know that Pair a station is the thing in the corner. So the
 * step names a control, the control carries `data-guide` with that name, and
 * this draws a ring round it and a card at it saying what to do.
 *
 * The card sits over everything, panels included, because the panel is where
 * the work happens. An instruction that stands down the moment a church opens
 * the thing it was pointing at is an instruction nobody ever reads, which is
 * exactly what the rail's own copy was doing.
 *
 * It points and stops there. Nothing is dimmed, nothing is blocked, the
 * control underneath works the whole time, and the card closes. A church that
 * would rather do something else first is not being held by the wrist.
 */
export function Point({
  target,
  title,
  body,
  onClose,
}: {
  target: string | null;
  /** The step's name, so the card says which of the twelve this is. */
  title: string;
  /** The one sentence naming what to press on this screen. */
  body: string;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [spot, setSpot] = React.useState<Spot | null>(null);
  const box = React.useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = React.useState(124);

  // Its real height, once it has one, so above and below land where they say.
  React.useEffect(() => {
    if (!box.current) return;
    const watch = new ResizeObserver(([entry]) => {
      const next = Math.round(entry!.contentRect.height);
      if (next > 0) setHeight(next + 28);
    });
    watch.observe(box.current);
    return () => watch.disconnect();
  }, [spot?.side]);

  React.useEffect(() => {
    if (!target) {
      setSpot(null);
      return;
    }

    let frame = 0;
    let stop = false;
    const since = Date.now();

    const place = (found: Element) => {
      const box = found.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) return setSpot(null);

      const inView =
        box.bottom > EDGE
        && box.top < window.innerHeight - EDGE
        && box.right > EDGE
        && box.left < window.innerWidth - EDGE;
      if (!inView) return setSpot(null);

      /*
       * Where the card goes is decided by the control, not by a preference.
       *
       * A wide control, a drop zone across a panel, has no near side: a card
       * beside it lands a long way from anything, so it goes under it. A
       * narrow one, a button in a corner, is best named from beside it. Then
       * whichever of those has the room.
       */
      const roomLeft = box.left;
      const roomRight = window.innerWidth - box.right;
      const roomAbove = box.top;
      const roomBelow = window.innerHeight - box.bottom;
      const beside = CARD + GAP + MARGIN;
      const tall = height + GAP + MARGIN;

      const side: Side = box.width > 420
        ? roomBelow > tall ? "below"
          : roomAbove > tall ? "above"
          : roomRight > beside ? "right" : "left"
        : roomLeft > beside ? "left"
          : roomRight > beside ? "right"
          : roomBelow > tall ? "below" : "above";

      /*
       * The beak points at the middle of the control, and the card is kept
       * inside the window, so the two are worked out together rather than the
       * beak being stuck to the card's middle and missing.
       */
      const middle =
        side === "left" || side === "right"
          ? box.top + box.height / 2
          : box.left + box.width / 2;

      setSpot({
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
        side,
        beak: middle,
      });
    };

    const look = () => {
      if (stop) return;
      const found = document.querySelector(`[data-guide="${CSS.escape(target)}"]`);
      if (found) return place(found);
      setSpot(null);
      // The screen may still be streaming. Keep looking, briefly.
      if (Date.now() - since < PATIENCE) frame = requestAnimationFrame(look);
    };

    look();

    /*
     * Its box is watched rather than polled: a panel opening over it, a row
     * above it unfolding, a window resized, all move it, and none of them is
     * a scroll event.
     */
    /*
     * Measured once a frame at most.
     *
     * The watcher is a MutationObserver over the whole body, because the
     * control belongs to a screen that redraws it and a listener bound to the
     * element would not survive that. A busy screen can fire it hundreds of
     * times in a frame, and each call reads a bounding box, which is a layout.
     * Coalescing to one read a frame makes the cost of watching the same
     * whether a row changed or a thousand did.
     */
    let queued = 0;
    const watch = () => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        const found = document.querySelector(`[data-guide="${CSS.escape(target)}"]`);
        if (found) place(found);
        else setSpot(null);
      });
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
      if (queued) cancelAnimationFrame(queued);
      size.disconnect();
      tree.disconnect();
      window.removeEventListener("scroll", watch, true);
      window.removeEventListener("resize", watch);
    };
  }, [target, pathname, height]);

  /*
   * Acting on the control puts the card away.
   *
   * The card is there to get somebody to the thing and say what it is for. The
   * moment they press it they are doing the work, and an instruction still
   * sitting over it is in the way of what it asked for. Watched on the
   * document rather than bound to the element, because the control is redrawn
   * by its own screen and a listener on it would not survive that.
   */
  React.useEffect(() => {
    if (!target) return;
    const acted = (e: Event) => {
      const at = e.target as Element | null;
      if (at?.closest?.(`[data-guide="${CSS.escape(target)}"]`)) onClose();
    };
    document.addEventListener("pointerdown", acted, true);
    return () => document.removeEventListener("pointerdown", acted, true);
  }, [target, onClose]);

  /*
   * Escape closes the card, and stops there.
   *
   * Caught on the way down and held, so the panel underneath keeps its own
   * Escape: the first press puts the card away and the second closes the
   * panel, which is the order somebody pressing it twice expects.
   */
  React.useEffect(() => {
    if (!spot) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", key, true);
    return () => document.removeEventListener("keydown", key, true);
  }, [spot, onClose]);

  if (!spot) return null;

  const ring = {
    top: `${spot.top - 5}px`,
    left: `${spot.left - 5}px`,
    width: `${spot.width + 10}px`,
    height: `${spot.height + 10}px`,
  };

  const inside = (value: number, most: number) =>
    Math.max(MARGIN, Math.min(value, most - MARGIN));

  /* Where the card goes, and where along it the beak lands. */
  let card: React.CSSProperties;
  let beak: React.CSSProperties;

  if (spot.side === "left" || spot.side === "right") {
    const top = inside(spot.beak - height / 2, window.innerHeight - height);
    card = {
      top: `${top}px`,
      left:
        spot.side === "left"
          ? `${spot.left - GAP - CARD}px`
          : `${spot.left + spot.width + GAP}px`,
      width: `${CARD}px`,
    };
    beak = {
      top: `${Math.max(14, Math.min(spot.beak - top - 5, height - 24))}px`,
      [spot.side === "left" ? "right" : "left"]: "-5px",
    };
  } else {
    const left = inside(spot.beak - CARD / 2, window.innerWidth - CARD);
    card = {
      left: `${left}px`,
      top:
        spot.side === "above"
          ? `${spot.top - GAP - height}px`
          : `${spot.top + spot.height + GAP}px`,
      width: `${CARD}px`,
    };
    beak = {
      left: `${Math.max(14, Math.min(spot.beak - left - 5, CARD - 24))}px`,
      [spot.side === "above" ? "bottom" : "top"]: "-5px",
    };
  }

  return (
    /*
     * Over the panels, because the panel is where the work is. The layer takes
     * no presses so the control underneath stays the thing being pressed; only
     * the card itself does.
     */
    <div className="pointer-events-none fixed inset-0 z-[60]">
      <span aria-hidden data-guide-ring className="absolute rounded-[12px]" style={ring} />

      <div
        ref={box}
        data-guide-card
        role="note"
        aria-live="polite"
        /*
         * A press on the card stays on the card.
         *
         * The card is drawn from the frame rather than from inside whatever
         * panel it is pointing into, so a panel watching for a press outside
         * itself counted every press on the card as one and shut, the x
         * included.
         *
         * It takes the immediate form. React and the panel both listen on the
         * document, so stopping propagation there is too late: the event has
         * already arrived, and the panel's listener is a neighbour rather than
         * an ancestor. React has dispatched this card's own handlers by the
         * time these run, so nothing of ours is lost.
         */
        onPointerDown={(e) => e.nativeEvent.stopImmediatePropagation()}
        onMouseDown={(e) => e.nativeEvent.stopImmediatePropagation()}
        onTouchStart={(e) => e.nativeEvent.stopImmediatePropagation()}
        onFocus={(e) => e.nativeEvent.stopImmediatePropagation()}
        className={cn(
          "pointer-events-auto absolute flex flex-col gap-1.5 rounded-[14px] p-3.5",
          "border border-primary bg-surface shadow-[0_10px_30px_oklch(0.3_0.04_75/0.22)]",
        )}
        style={card}
      >
        <span
          aria-hidden
          data-guide-beak
          data-side={spot.side}
          className="absolute size-2.5 rotate-45"
          style={beak}
        />

        <div className="flex items-start gap-2">
          <span className="min-w-0 flex-1 text-[12px] leading-4 font-semibold tracking-[0.04em] text-primary uppercase">
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("setup.gotIt")}
            className="-m-1 -mt-1.5 grid size-6 shrink-0 cursor-pointer place-items-center rounded-md text-fg-subtle transition-colors duration-instant hover:bg-sunken hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <p className="m-0 text-[13px] leading-[19px] text-fg">{body}</p>
      </div>
    </div>
  );
}
