/**
 * R13.21. What the giving screen is narrowed to, worked out from the address.
 *
 * Plain functions with no directive on the file, because the server page
 * reads the address and the panel writes it, and a helper that lives in a
 * "use client" module cannot be called from the server at all.
 */

/** R13.21. The stretches of time a treasurer actually asks about. */
export const PERIODS = ["month", "quarter", "year", "lastYear", "all"] as const;
export type Period = (typeof PERIODS)[number];

export const METHODS = ["cash", "cheque", "card", "ach", "in_kind", "other"] as const;
export const STATES = ["settled", "pending", "failed", "refunded"] as const;

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
