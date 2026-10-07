import Stripe from "stripe";

/**
 * R13.1, R13.2. The platform's Stripe client, and the one rule it works under.
 *
 * Every charge is a **direct charge on the church's own connected account**:
 * the request is made with the church's account in the `Stripe-Account` header,
 * so Stripe treats the church as the merchant of record. The money never
 * touches a ConnectApp balance, and the processing fee is deducted from the
 * church's own funds by Stripe, exactly as it would be if the church had signed
 * up with Stripe directly. `PLATFORM_FEE` is zero and is written down here so
 * that a later change to it is a visible one.
 *
 * Card details never reach this server: a gift is taken on a Stripe-hosted
 * Checkout page or an embedded Element, which keeps the church and the platform
 * in PCI scope SAQ-A.
 */

/** R13.1. What ConnectApp takes from a gift. Zero, and it stays zero. */
export const PLATFORM_FEE = 0;

let client: Stripe | null = null;

/** The platform's own Stripe client. Server only: the key never leaves it. */
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  /*
   * No pinned version: the SDK's own is what its types describe, and the
   * Accounts v2 API this product creates accounts with lives there. Pinning an
   * older one is what made `accounts.create` answer that v1 is no longer
   * recommended for a new integration.
   */
  client ??= new Stripe(key);
  return client;
}

/** Whether the platform is set up to talk to Stripe at all. */
export const stripeConfigured = (): boolean => Boolean(process.env.STRIPE_SECRET_KEY);

/**
 * R13.1. The options that make a request act on the church's own account.
 *
 * Passed to any call about a church's money. Without it the call acts on the
 * platform account, which is the one thing this product must never do with a
 * church's gift.
 */
export const asChurch = (accountId: string): Stripe.RequestOptions => ({
  stripeAccount: accountId,
});

export { FEE_RATE, FEE_FIXED, withFee } from "./stripe-fee";
