"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { t, plural } from "@connectapp/i18n";
import { FilterDrawer, FilterGroup, ChipButton } from "@/components/filter-drawer";

/** R13.21. The stretches of time a treasurer actually asks about. */
export const PERIODS = ["month", "quarter", "year", "lastYear", "all"] as const;
export type Period = (typeof PERIODS)[number];

const METHODS = ["cash", "cheque", "card", "ach", "in_kind", "other"] as const;
const STATES = ["settled", "pending", "failed", "refunded"] as const;

/**
 * R13.21. What the address is asking for, read once.
 *
 * The filter lives in the address rather than in the browser, so a treasurer
 * can send somebody "last year's bank gifts" and get the same screen back,
 * and so the server does the narrowing rather than shipping every gift to
 * the page and hiding most of them.
 */
export interface Narrowing {
  period: Period;
  fundId?: string;
  method?: string;
  status?: string;
}

export function narrowingFrom(params: {
  period?: string;
  fund?: string;
  how?: string;
  state?: string;
}): Narrowing {
  const period = PERIODS.includes(params.period as Period)
    ? (params.period as Period)
    : "year";
  return {
    period,
    fundId: params.fund || undefined,
    method: METHODS.includes(params.how as never) ? params.how : undefined,
    status: STATES.includes(params.state as never) ? params.state : undefined,
  };
}

/** How many of them are doing something, which the button carries. */
export function narrowingCount(one: Narrowing): number {
  return (one.period === "year" ? 0 : 1)
    + (one.fundId ? 1 : 0)
    + (one.method ? 1 : 0)
    + (one.status ? 1 : 0);
}

/**
 * R13.21. The period as two dates, worked out against the church's own day.
 *
 * A church in Auckland closes its year twenty hours before one in Missouri,
 * so "this year" is the year it is there rather than wherever the server is.
 */
export function periodRange(period: Period, today: string): { from?: string; to?: string } {
  const year = Number(today.slice(0, 4));
  switch (period) {
    case "all":
      return {};
    case "month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "lastYear":
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
    case "quarter": {
      const start = new Date(`${today}T00:00:00Z`);
      start.setUTCMonth(start.getUTCMonth() - 3);
      return { from: start.toISOString().slice(0, 10), to: today };
    }
    default:
      return { from: `${year}-01-01`, to: `${year}-12-31` };
  }
}

/**
 * The panel itself.
 *
 * Choosing anything sends the reader to a new address, which is also what
 * clears the pager: a narrowed list has its own first page, and leaving
 * somebody on page four of a list that now holds eleven rows is a blank
 * screen with no explanation.
 */
export function GivingFilters({
  church,
  now,
  funds,
  matching,
}: {
  church: string;
  now: Narrowing;
  funds: { id: string; name: string }[];
  /** How many gifts the current narrowing matches, for the foot. */
  matching: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const go = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.set("church", church);
    next.delete("gifts");
    next.delete("counts");
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <FilterDrawer
      title={t("giving.filter.title")}
      narrowing={narrowingCount(now)}
      onClear={() => go({ period: undefined, fund: undefined, how: undefined, state: undefined })}
      done={plural("giving.filter.done", matching)}
    >
      <FilterGroup label={t("giving.filter.period")}>
        {PERIODS.map((one) => (
          <ChipButton
            key={one}
            tone="ink"
            on={now.period === one}
            onClick={() => go({ period: one === "year" ? undefined : one })}
          >
            {t(`giving.filter.period.${one}` as never)}
          </ChipButton>
        ))}
      </FilterGroup>

      {funds.length > 0 ? (
        <FilterGroup label={t("giving.filter.fund")}>
          <ChipButton tone="ink" on={!now.fundId} onClick={() => go({ fund: undefined })}>
            {t("giving.filter.any")}
          </ChipButton>
          {funds.map((fund) => (
            <ChipButton
              key={fund.id}
              tone="ink"
              on={now.fundId === fund.id}
              onClick={() => go({ fund: now.fundId === fund.id ? undefined : fund.id })}
            >
              {fund.name}
            </ChipButton>
          ))}
        </FilterGroup>
      ) : null}

      <FilterGroup label={t("giving.filter.method")}>
        <ChipButton tone="ink" on={!now.method} onClick={() => go({ how: undefined })}>
          {t("giving.filter.any")}
        </ChipButton>
        {METHODS.map((one) => (
          <ChipButton
            key={one}
            tone="ink"
            on={now.method === one}
            onClick={() => go({ how: now.method === one ? undefined : one })}
          >
            {t(`giving.method.${one}` as never)}
          </ChipButton>
        ))}
      </FilterGroup>

      <FilterGroup label={t("giving.filter.status")}>
        <ChipButton tone="ink" on={!now.status} onClick={() => go({ state: undefined })}>
          {t("giving.filter.any")}
        </ChipButton>
        {STATES.map((one) => (
          <ChipButton
            key={one}
            tone="ink"
            on={now.status === one}
            onClick={() => go({ state: now.status === one ? undefined : one })}
          >
            {t(`giving.filter.status.${one}` as never)}
          </ChipButton>
        ))}
      </FilterGroup>
    </FilterDrawer>
  );
}
