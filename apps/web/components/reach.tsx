"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { t } from "@connectapp/i18n";

/** One column's worth of travel, which is what a press moves. */
const COLUMN = 150;

/**
 * R10.3, R24.6. Reaching the services that do not fit across the board.
 *
 * Six columns fit at a desk and a church with a weeknight meeting has ten in
 * a month, so the grid scrolls. A trackpad does it by itself and a mouse
 * does not, which is most of the churches this is built for, so the arrows
 * are there to be pressed. Each one appears only while there is something
 * that way, so a month that fits shows neither.
 */
export function Reach({ to }: { to: React.RefObject<HTMLDivElement | null> }) {
  const [canGo, setCanGo] = React.useState({ back: false, on: false });

  React.useEffect(() => {
    const box = to.current;
    if (!box) return;

    const read = () => {
      const over = box.scrollWidth - box.clientWidth;
      setCanGo({ back: box.scrollLeft > 1, on: box.scrollLeft < over - 1 });
    };

    read();
    box.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    /* A team with more positions, or a month with more services, changes the
       width without anybody scrolling or resizing anything. */
    const watch = new ResizeObserver(read);
    watch.observe(box);
    return () => {
      box.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
      watch.disconnect();
    };
  }, [to]);

  const go = (by: number) => to.current?.scrollBy({ left: by, behavior: "smooth" });

  return (
    <>
      {canGo.back ? (
        <button
          type="button"
          aria-label={t("serving.earlierServices")}
          onClick={() => go(-COLUMN)}
          className="absolute left-2 top-1/2 z-10 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-line bg-surface text-fg shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:bg-sunken"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
      ) : null}

      {canGo.on ? (
        <button
          type="button"
          aria-label={t("serving.laterServices")}
          onClick={() => go(COLUMN)}
          className="absolute right-2 top-1/2 z-10 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-line bg-surface text-fg shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:bg-sunken"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      ) : null}
    </>
  );
}
