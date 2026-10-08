"use client";

import * as React from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Skeleton } from "@connectapp/ui";

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
  /*
   * Whether to keep drawing the shape underneath. Stripe's frame does not
   * tell us when it has painted, and it covers this as soon as it does, so
   * the shape is simply taken away after long enough to have arrived.
   */
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 6000);
    return () => window.clearTimeout(timer);
  }, []);

  const stripe = React.useMemo<Promise<Stripe | null>>(
    () => loadStripe(publishableKey, { stripeAccount: accountId }),
    [publishableKey, accountId],
  );

  return (
    // Stripe draws its own layout inside the frame, and it needs the room:
    // a summary line, a payment method list and a card form do not fold.
    <div className="relative min-h-[460px] w-full">
      {/* R13.6. Stripe's frame arrives over the top of this. Until it does,
          the shape of what is coming, so the giver is looking at a form
          being drawn rather than at a hole. */}
      {ready ? null : (
        <div className="absolute inset-0 flex flex-col gap-4" aria-hidden>
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <div className="flex gap-4">
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 flex-1" />
          </div>
          <Skeleton className="mt-2 h-12 w-full" />
        </div>
      )}

      <EmbeddedCheckoutProvider stripe={stripe} options={{ clientSecret: secret }}>
        <EmbeddedCheckout className="relative" />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
