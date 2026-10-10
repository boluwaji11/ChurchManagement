"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Minus } from "lucide-react";
import { t } from "@connectapp/i18n";
import { Reach } from "@/components/reach";

/** Fewest shown, and the most, however wide the screen is. */
const LEAST = 3;
const MOST = 6;
/** How many more arrive on each press. */
const STEP = 4;

/**
 * R11.1. The church's other services, so a leader planning three in a week
 * moves between them without going back to the list.
 *
 * As many as the row holds, worked out from its width. Show more lengthens it
 * four at a time, and the row runs sideways under the arrows rather than
 * wrapping down the screen: a church meeting three times a week has a hundred
 * and fifty of these in a year.
 */
export function PlanTabs({
  church,
  current,
  tabs,
}: {
  church: string;
  current: string;
  tabs: { id: string; slug: string; when: string; name: string }[];
}) {
  const box = React.useRef<HTMLDivElement>(null);
  const row = React.useRef<HTMLDivElement>(null);
  const [fits, setFits] = React.useState(LEAST);
  const [more, setMore] = React.useState(0);

  React.useEffect(() => {
    const el = box.current;
    if (!el) return;

    /*
     * Measured against a tab's own width rather than each one's, so the count
     * does not jump about as the names change, and against four fifths of the
     * row, so the last one is never jammed against the edge.
     */
    const measure = () => {
      const widest = Math.max(
        180,
        ...[...el.querySelectorAll<HTMLElement>("[data-tab]")].map((tab) => tab.offsetWidth),
      );
      const room = el.clientWidth * 0.8;
      setFits(Math.min(MOST, Math.max(LEAST, Math.floor(room / (widest + 8)))));
    };

    measure();
    /* Measured again after the browser has laid the row out, because the
       first reading is taken while the row is still the width of nothing. */
    const soon = requestAnimationFrame(() => requestAnimationFrame(measure));
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => {
      cancelAnimationFrame(soon);
      watch.disconnect();
    };
  }, [tabs.length]);

  const here = Math.max(0, tabs.findIndex((one) => one.id === current));
  const fitted = Math.max(fits, here + 1);
  const shown = Math.min(tabs.length, fitted + more);

  return (
    <div ref={box} className="flex items-center justify-center gap-3">
      <div className="relative min-w-0">
        <div
          ref={row}
          className="flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {/* Centred while the row is short, and scrolled from its start once
              it is longer than the space it has. */}
          <div className="mx-auto flex w-max items-center gap-2">
          {tabs.map((one, i) => (
            <Link
              key={one.id}
              data-tab=""
              href={`/services/${one.slug}/plan?church=${church}`}
              aria-current={one.id === current ? "page" : undefined}
              // Measured even when it is not shown, so the count is honest.
              hidden={i >= shown}
              className={`flex shrink-0 flex-col rounded-md border px-3.5 py-2 ${
                one.id === current
                  ? "border-primary bg-primary-soft"
                  : "border-line bg-surface hover:bg-sunken"
              }`}
            >
              <span className="whitespace-nowrap text-[12px] font-medium text-fg-subtle">
                {one.when}
              </span>
              <span className="whitespace-nowrap font-semibold text-fg">{one.name}</span>
            </Link>
          ))}
          </div>
        </div>

        {/* Each arrow shows itself only while there is something that way. */}
        <Reach to={row} watch={shown} />
      </div>

      {/* Outside the row, so a longer row never carries them off the screen. */}
      <div className="flex shrink-0 items-center gap-2">
        {shown < tabs.length ? (
          <button
            type="button"
            onClick={() => setMore((n) => n + STEP)}
            className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-sm px-1 font-medium text-primary hover:underline"
          >
            <Plus className="size-4" aria-hidden /> {t("services.showMore")}
          </button>
        ) : null}

        {more > 0 ? (
          <button
            type="button"
            onClick={() => setMore(0)}
            className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-sm px-1 font-medium text-primary hover:underline"
          >
            <Minus className="size-4" aria-hidden /> {t("services.showLess")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
