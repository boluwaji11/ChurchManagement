/**
 * R13.5. The fee a giver may offer to cover, worked out on the client too.
 *
 * Split out of `lib/stripe.ts` because that module holds the server's Stripe
 * client and its key, and the giving page is drawn in the browser. The numbers
 * are Stripe's US nonprofit rate; the server works the charge out again from
 * the same figures, so what is shown is what is charged.
 */
export const FEE_RATE = 0.022;
export const FEE_FIXED = 30;

export function withFee(cents: number): number {
  return Math.round((cents + FEE_FIXED) / (1 - FEE_RATE));
}
