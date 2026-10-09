"use client";

import * as React from "react";
import Link from "next/link";
import { Reach } from "@/components/reach";

/**
 * R11.1. The church's other services, so a leader planning three in a week
 * moves between them without going back to the list.
 *
 * One row that keeps its height, with an arrow at each end. A church meeting
 * three times a week has a hundred and fifty of these in a year, and wrapping
 * them filled the screen with dates nobody asked for.
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
  const here = React.useRef<HTMLAnchorElement>(null);

  /* The one being read starts in view, however far down the year it is. */
  React.useEffect(() => {
    here.current?.scrollIntoView({ block: "nearest", inline: "start" });
  }, [current]);

  return (
    <div className="relative">
      <div
        ref={row}
        className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((one) => (
          <Link
            key={one.id}
            ref={one.id === current ? here : undefined}
            href={`/services/${one.slug}/plan?church=${church}`}
            aria-current={one.id === current ? "page" : undefined}
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

      <Reach to={row} />
    </div>
  );
}
