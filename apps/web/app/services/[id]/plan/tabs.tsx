"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { t } from "@hearth/i18n";

/**
 * R11.1. The church's other gatherings, so a leader planning three in a week
 * moves between them without going back to the list.
 *
 * As many as the row holds, worked out from the width rather than a number, so
 * a wide screen shows eight and a laptop shows four. The rest arrive on Show
 * more, and the one being read is always among them.
 */
export function PlanTabs({
  church,
  current,
  tabs,
}: {
  church: string;
  current: string;
  tabs: { id: string; when: string; name: string }[];
}) {
  const row = React.useRef<HTMLDivElement>(null);
  const [fits, setFits] = React.useState(tabs.length);
  const [all, setAll] = React.useState(false);

  /** Space kept for the Show more link when there is more to show. */
  const MORE = 150;

  React.useEffect(() => {
    const el = row.current;
    if (!el) return;

    const measure = () => {
      const width = el.clientWidth;
      const children = [...el.children] as HTMLElement[];
      let used = 0;
      let n = 0;

      for (const child of children) {
        const next = used + child.offsetWidth + (n > 0 ? 8 : 0);
        // The last one may use the room the Show more link would have taken.
        const room = n === children.length - 1 ? width : width - MORE;
        if (next > room) break;
        used = next;
        n += 1;
      }

      setFits(Math.max(1, n));
    };

    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, [tabs.length]);

  const here = Math.max(0, tabs.findIndex((one) => one.id === current));
  const shown = all ? tabs.length : Math.max(fits, here + 1);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        ref={row}
        className={all ? "flex flex-wrap gap-2" : "flex min-w-0 flex-1 gap-2 overflow-hidden"}
      >
        {tabs.map((one, i) => (
          <Link
            key={one.id}
            href={`/services/${one.id}/plan?church=${church}`}
            aria-current={one.id === current ? "page" : undefined}
            // Measured even when it is not shown, so the count is honest.
            hidden={i >= shown}
            className={`flex shrink-0 flex-col rounded-md border px-3.5 py-2 ${
              one.id === current
                ? "border-primary bg-primary-soft"
                : "border-line bg-surface hover:border-line-strong"
            }`}
          >
            <span className="whitespace-nowrap text-[12px] font-medium text-fg-subtle">
              {one.when}
            </span>
            <span className="whitespace-nowrap font-semibold text-fg">{one.name}</span>
          </Link>
        ))}
      </div>

      {!all && shown < tabs.length ? (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-sm px-1 py-1 font-medium text-primary hover:underline"
        >
          <Plus className="size-4" aria-hidden /> {t("services.showMore")}
        </button>
      ) : null}
    </div>
  );
}
