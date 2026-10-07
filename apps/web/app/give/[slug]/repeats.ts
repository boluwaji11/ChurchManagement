/**
 * R13.3. The rhythms a church's givers keep, shortest first.
 *
 * Plain data rather than part of the actions beside it: a file of server
 * actions may export nothing but async functions, and the giving page draws
 * these in the browser.
 */
export const REPEATS = ["once", "week", "fortnight", "month", "year"] as const;
export type Repeat = (typeof REPEATS)[number];

/**
 * The same, as Stripe says it.
 *
 * A fortnight is a week counted twice, which is Stripe's own way of putting
 * it, so nothing here invents a word for the pair.
 */
export const EVERY: Record<
  Exclude<Repeat, "once">,
  { interval: "week" | "month" | "year"; count: number }
> = {
  week: { interval: "week", count: 1 },
  fortnight: { interval: "week", count: 2 },
  month: { interval: "month", count: 1 },
  year: { interval: "year", count: 1 },
};
