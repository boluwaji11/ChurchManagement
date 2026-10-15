import "server-only";

/**
 * R21.5, R24.11. How long this product waits on somebody else's server.
 *
 * Every call that leaves the building is a call that can hang, and a request
 * hanging on a provider holds a connection, a worker and a church's screen with
 * it. Each one is given a number here rather than taking whichever default the
 * library it belongs to happens to ship, which for Stripe's own client is 80
 * seconds.
 *
 * The numbers are what the work is worth waiting for: a screen's own request
 * gives up first, a send has longer because it is already behind a queue that
 * will try again, and a lookup over DNS has the least because there are three
 * of them in a row behind one press.
 */

/** A provider answering a screen: Stripe, Resend, the storage bucket. */
export const PROVIDER_BUDGET_MS = 15_000;

/** Authentication, which sits in front of every screen. */
export const AUTH_BUDGET_MS = 10_000;

/** Reading something a church pointed us at: a logo, a page, a record. */
export const FETCH_BUDGET_MS = 8_000;

/**
 * `fetch` with a limit on it, for a client that takes its own.
 *
 * A caller that has already set a signal keeps it: an upload that carries a
 * cancellation of its own means it, and a budget applied over the top would
 * take the longer of the two away from it.
 */
export function budgetedFetch(budgetMs: number): typeof fetch {
  return (input, init) =>
    fetch(input, init?.signal ? init : { ...init, signal: AbortSignal.timeout(budgetMs) });
}
