"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * Which side of the control the card sits on.
 *
 * `centre` is the card on its own in the middle of the window, for a stop that
 * names no control: the first card of a walk says what the screen is for, and
 * a ring round the whole screen is a ring round nothing.
 */
type Side = "left" | "right" | "above" | "below" | "centre";

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
  stops,
  title,
  onClose,
  at,
  onBack,
  onNext,
  lastLabel,
  count,
  waits,
}: {
  /**
   * R22.3. The controls this step is walked through, in order, each with the
   * sentence that belongs to it.
   *
   * The deepest one on the screen is the one shown, because that is where
   * somebody has got to: pressing Create from template leaves the button
   * where it was and puts the box of templates over it, so both are present
   * and the later one is the answer. Closing the box takes it away again and
   * the card goes back to the press before, which is what going back means.
   */
  stops: readonly { target: string; body: string; field?: boolean }[];
  /** The step's name, so the card says which of the seventeen this is. */
  title: string;
  onClose: () => void;
  /**
   * The stop to show, where the caller is driving rather than the screen.
   *
   * A setup step points at the work and lets the screen say where somebody has
   * got to. A walk through one screen is the other way round: everything is
   * already on the page at once, so the reader moves with Back and Next and
   * this follows. Pass it with `onBack` and `onNext`.
   */
  at?: number;
  onBack?: () => void;
  onNext?: () => void;
  /** What the last Next says, where it finishes rather than continues. */
  lastLabel?: string;
  /**
   * How many stops there are altogether, and which this is, where the walk
   * runs across two screens and the card should count the whole of it.
   */
  count?: { at: number; of: number };
  /**
   * Hides Next, for a stop that waits on the reader doing the thing rather
   * than on them reading the card. The walk carries on by itself afterwards.
   */
  waits?: boolean;
}) {
  const pathname = usePathname();
  const [found, setFound] = React.useState(0);
  const driven = at !== undefined;
  const setAt = driven ? () => {} : setFound;
  const now = driven ? at : found;
  const target = stops[now]?.target ?? null;
  const body = stops[now]?.body ?? "";

  /*
   * Which stop the screen is on, re-read whenever the screen changes. The
   * query is cheap and the alternative, remembering, is a state machine that
   * disagrees with the screen the first time somebody presses Escape.
   */
  const names = stops.map((one) => one.target).join("|");
  React.useEffect(() => {
    /* Driven from outside, so the screen does not get a vote. */
    if (driven) return undefined;
    const look = () => {
      let reached = 0;
      for (let i = 0; i < stops.length; i += 1) {
        const one = stops[i]!;
        const found = document.querySelector(`[data-guide="${CSS.escape(one.target)}"]`);
        if (!found) continue;

        /*
         * A field stops the walk while it is empty. Everything in a form is
         * on the screen at once, so going by what is drawn would put the card
         * on the last box rather than the first one left to fill in.
         */
        if (one.field) {
          const value = (found as HTMLInputElement).value;
          if (!value || !value.trim()) {
            reached = i;
            break;
          }
        }
        reached = i;
      }
      setAt(reached);
    };
    look();

    let queued = 0;
    const watch = () => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        look();
      });
    };
    const tree = new MutationObserver(watch);
    tree.observe(document.body, { childList: true, subtree: true });
    /* Filling a box changes nothing in the tree, so the typing is listened
       for as well. */
    document.addEventListener("input", watch, true);
    document.addEventListener("change", watch, true);
    return () => {
      tree.disconnect();
      document.removeEventListener("input", watch, true);
      document.removeEventListener("change", watch, true);
      if (queued) cancelAnimationFrame(queued);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names, pathname, driven]);
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
      /* A stop with nothing to ring is a card in the middle of the window. */
      setSpot({ top: 0, left: 0, width: 0, height: 0, side: "centre", beak: 0 });
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

      /*
       * A control can ask for a side, and does where the guide's own choice
       * would land on something: "I am signed in" sits at the end of a row of
       * three, and a card beside it covered the other two.
       */
      const asked = found.getAttribute("data-guide-side") as Exclude<Side, "centre"> | null;
      const room: Record<Exclude<Side, "centre">, boolean> = {
        left: roomLeft > beside,
        right: roomRight > beside,
        below: roomBelow > tall,
        above: roomAbove > tall,
      };

      const side: Side = asked && room[asked]
        ? asked
        : box.width > 420
          ? room.below ? "below"
            : room.above ? "above"
            : room.right ? "right" : "left"
          : room.left ? "left"
            : room.right ? "right"
            : room.below ? "below" : "above";

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
     * R24.x. And again until it stops moving, for about a second.
     *
     * A panel slides in from the right, which is a transform: it fires no
     * mutation, no resize and no scroll, so the first measurement is taken
     * while the field is still travelling and the ring is left where the
     * field was rather than where it landed. Measured every frame while
     * anything is changing, and only when it has changed, so a box that
     * settles immediately costs one comparison a frame and nothing else.
     */
    let settling = 0;
    let was = "";
    const settle = () => {
      if (stop) return;
      const found = document.querySelector(`[data-guide="${CSS.escape(target)}"]`);
      if (found) {
        const b = found.getBoundingClientRect();
        const now = `${b.x},${b.y},${b.width},${b.height}`;
        if (now !== was) {
          was = now;
          place(found);
        }
      }
      if (Date.now() - since < 1200) settling = requestAnimationFrame(settle);
    };
    settling = requestAnimationFrame(settle);

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
    /* Anything that slides or grows, once it has finished doing so. */
    document.addEventListener("transitionend", watch, true);
    document.addEventListener("animationend", watch, true);

    return () => {
      stop = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(settling);
      if (queued) cancelAnimationFrame(queued);
      size.disconnect();
      tree.disconnect();
      window.removeEventListener("scroll", watch, true);
      window.removeEventListener("resize", watch);
      document.removeEventListener("transitionend", watch, true);
      document.removeEventListener("animationend", watch, true);
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
  const last = now === stops.length - 1;
  React.useEffect(() => {
    /*
     * A walk that is driven from outside carries on past the press: the thing
     * somebody has just pressed is often the thing that brings the next card
     * into being, and closing here would end the walk at its second stop.
     */
    if (driven) return undefined;
    if (!target || !last) return undefined;
    const acted = (e: Event) => {
      const on = e.target as Element | null;
      if (on?.closest?.(`[data-guide="${CSS.escape(target)}"]`)) onClose();
    };
    document.addEventListener("pointerdown", acted, true);
    return () => document.removeEventListener("pointerdown", acted, true);
  }, [target, last, onClose, driven]);

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

  if (spot.side === "centre") {
    card = {
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: `${CARD + 40}px`,
    };
    beak = { display: "none" };
  } else if (spot.side === "left" || spot.side === "right") {
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
      {spot.side === "centre" ? null : (
        <span aria-hidden data-guide-ring className="absolute rounded-[12px]" style={ring} />
      )}

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

        {driven ? (
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-[12px] text-fg-subtle">
              {t("setup.walk.count", {
                at: String(count ? count.at : now + 1),
                of: String(count ? count.of : stops.length),
              })}
            </span>
            <span className="flex items-center gap-1.5">
              {now > 0 ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="cursor-pointer rounded-md px-2 py-1 text-[12px] font-medium text-fg-muted transition-colors hover:bg-sunken hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                >
                  {t("setup.walk.back")}
                </button>
              ) : null}
              {waits ? null : (
                <button
                  type="button"
                  onClick={onNext}
                  className="cursor-pointer rounded-md bg-primary px-2.5 py-1 text-[12px] font-semibold text-primary-fg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                >
                  {now === stops.length - 1 ? lastLabel ?? t("setup.walk.done") : t("setup.walk.next")}
                </button>
              )}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
