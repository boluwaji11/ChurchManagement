"use client";

import * as React from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";

/**
 * R13.2, R13.6. Stripe's payment fields, inside the church's own page.
 *
 * The fields are Stripe's, in Stripe's frame, served from Stripe. The card
 * number goes from the giver's browser to Stripe and never passes through
 * this product, which is what keeps every church on it in PCI scope SAQ-A.
 * What changes is only that the giver does not leave the page they are on.
 *
 * The account is the church's own, so the charge is theirs from the first
 * keystroke.
 */
export function Pay({
  publishableKey,
  accountId,
  secret,
}: {
  publishableKey: string;
  /** The church's connected account, which the payment is made on. */
  accountId: string;
  secret: string;
}) {
  /*
   * One client a church. Stripe.js is told whose account this is when it
   * loads, and reloading it for every render would tear the frame down
   * mid-payment.
   */
  const stripe = React.useMemo<Promise<Stripe | null>>(
    () => loadStripe(publishableKey, { stripeAccount: accountId }),
    [publishableKey, accountId],
  );

  return (
    // Stripe draws its own layout inside the frame; what we decide is where
    // the frame sits, which is the middle of the card.
    <div className="mx-auto min-h-[420px] w-full max-w-[460px]">
      <EmbeddedCheckoutProvider stripe={stripe} options={{ clientSecret: secret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
