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

/**
 * R13.2, R13.15. The states, in the words the table itself uses.
 *
 * The filter offered "Settled" against a column reading "Received", which
 * are our word and the church's word for the same thing. The church's wins.
 */
export const STATES = ["settled", "pending", "failed", "refunded"] as const;

/** The message key each state is read by, which is the column's own. */
export const STATE_LABELS: Record<(typeof STATES)[number], string> = {
  settled: "giving.state.received",
  pending: "giving.state.processing",
  failed: "giving.state.failed",
  refunded: "giving.state.refunded",
};

/**
 * R13.21. What the address is asking for, read once.
 *
 * The narrowing lives in the address rather than in the browser, so a
 * treasurer can send somebody last year's bank gifts and get the same screen
 * back, and so the server does the narrowing rather than shipping every gift
 * to the page and hiding most of them.
 */
export interface Narrowing {
  period: Period;
  fundIds: string[];
  methods: string[];
  statuses: string[];
}

/** A comma separated list out of the address, keeping only what we know. */
const listOf = (raw: string | undefined, known?: readonly string[]): string[] => {
  const parts = (raw ?? "").split(",").map((one) => one.trim()).filter(Boolean);
  return known ? parts.filter((one) => known.includes(one)) : parts;
};

export function narrowingFrom(params: {
  period?: string;
  fund?: string;
  how?: string;
  state?: string;
}): Narrowing {
  return {
    period: PERIODS.includes(params.period as Period) ? (params.period as Period) : "year",
    fundIds: listOf(params.fund),
    methods: listOf(params.how, METHODS),
    statuses: listOf(params.state, STATES),
  };
}

/** How many of them are doing something, which the button carries. */
export function narrowingCount(one: Narrowing): number {
  return (one.period === "year" ? 0 : 1)
    + (one.fundIds.length > 0 ? 1 : 0)
    + (one.methods.length > 0 ? 1 : 0)
    + (one.statuses.length > 0 ? 1 : 0);
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
