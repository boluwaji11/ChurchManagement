"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@hearth/ui";
import { t } from "@hearth/i18n";

/** How many show at a time, and how many each press adds. */
const PAGE = 4;

/**
 * R11.1. The church's other gatherings, so a leader planning three in a week
 * moves between them without going back to the list.
 *
 * Four at a time, the same as the list this came from, because a church that
 * generates a year of services would otherwise get a year of tabs.
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
  const here = Math.max(0, tabs.findIndex((one) => one.id === current));
  const [shown, setShown] = React.useState(Math.max(PAGE, here + 1));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.slice(0, shown).map((one) => (
        <Link
          key={one.id}
          href={`/services/${one.id}/plan?church=${church}`}
          aria-current={one.id === current ? "page" : undefined}
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

      {shown < tabs.length ? (
        <Button variant="secondary" onClick={() => setShown((n) => n + PAGE)}>
          {t("services.showMore")}
        </Button>
      ) : null}
    </div>
  );
}
