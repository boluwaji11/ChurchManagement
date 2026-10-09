"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Minus } from "lucide-react";
import { t } from "@connectapp/i18n";

/** Fewest shown, and the most, however wide the screen is. */
const LEAST = 3;
const MOST = 6;
/** How many more arrive on each press. */
const STEP = 4;

/**
 * R11.1. The church's other services, so a leader planning three in a week
 * moves between them without going back to the list.
 *
 * One row that scrolls sideways. A church that meets three times a week has a
 * hundred and fifty of these in a year, and wrapping them filled the screen
 * with dates nobody asked for, so the row holds its height and Show more
 * lengthens it four at a time.
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
  const row = React.useRef<HTMLDivElement>(null);
  const [fits, setFits] = React.useState(LEAST);
  const [more, setMore] = React.useState(0);

  React.useEffect(() => {
    const el = row.current;
    if (!el) return;

    /*
     * Measured against a tab's own width rather than each one's, so the count
     * does not jump about as the names change, and against four fifths of the
     * row, so the last one is never jammed against the edge.
     */
    const measure = () => {
      const widest = Math.max(
        180,
        ...([...el.children] as HTMLElement[])
          .filter((child) => child.dataset.tab !== undefined)
          .map((child) => child.offsetWidth),
      );
      const room = el.clientWidth * 0.8;
      setFits(Math.min(MOST, Math.max(LEAST, Math.floor(room / (widest + 8)))));
    };

    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [tabs.length]);

  const here = Math.max(0, tabs.findIndex((one) => one.id === current));
  const shown = Math.min(tabs.length, Math.max(fits, here + 1) + more);

  return (
    <div
      ref={row}
      /* The row keeps its height and runs off to the right, which is where a
         date later than this one belongs. */
      className="flex items-center gap-2 overflow-x-auto pb-1"
    >
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

      {/* Beside the last one shown, so the two read as one list. */}
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
  );
}
