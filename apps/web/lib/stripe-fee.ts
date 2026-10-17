/**
 * R13.5. The fee a giver may offer to cover, worked out on the client too.
 *
 * Split out of `lib/stripe.ts` because that module holds the server's Stripe
 * client and its key, and the giving page is drawn in the browser. The server
 * works the charge out again from the same figures, so what is shown is what
 * is charged.
 *
 * Which rate applies is the church's own answer, carried on its account.
 * Stripe reports it nowhere, and it is granted by email rather than through
 * the API. Everybody starts on the full rate.
 */

/** Stripe's US rate for a 501(c)(3) it has granted the discount to. */
export const NONPROFIT_RATE = 0.022;

/** What Stripe charges every other account, and every church until it asks. */
export const STANDARD_RATE = 0.029;

export const FEE_FIXED = 30;

/** The rate Stripe charges this church. */
export const rateFor = (nonprofit: boolean): number =>
  nonprofit ? NONPROFIT_RATE : STANDARD_RATE;

/** What a gift has to be charged at so the church receives the whole of it. */
export function withFee(cents: number, nonprofit: boolean): number {
  return Math.round((cents + FEE_FIXED) / (1 - rateFor(nonprofit)));
}
