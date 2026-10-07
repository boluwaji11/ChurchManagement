import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  markStripeAccount, recordOnlineGift, saveRecurring, markRecurring,
} from "@connectapp/db";
import { stripe, stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * R13.1, R13.2. What Stripe tells us after the fact.
 *
 * Every event here is about a church's own connected account, which is why
 * each one carries `event.account`. Nothing in this path trusts the body: the
 * signature is checked first, and an event without one is refused.
 *
 * It is idempotent. Stripe redelivers an event whenever it is unsure the first
 * one landed, and a gift written twice is a statement that is wrong in January.
 */
export async function POST(request: Request) {
  if (!stripeConfigured()) return new NextResponse("Not configured", { status: 503 });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new NextResponse("Unsigned", { status: 400 });

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return new NextResponse("Bad signature", { status: 400 });
  }

  const account = event.account;

  try {
    switch (event.type) {
      /* R13.1. Stripe has finished asking the church for its details. */
      case "account.updated": {
        const updated = event.data.object as Stripe.Account;
        await markStripeAccount({
          accountId: updated.id,
          chargesEnabled: updated.charges_enabled ?? false,
          payoutsEnabled: updated.payouts_enabled ?? false,
          detailsSubmitted: updated.details_submitted ?? false,
        });
        break;
      }

      /*
       * R13.2. A gift went through on the church's own account.
       *
       * The fee is read from the charge, because the church pays it and its
       * treasurer reconciles the deposit against it.
       */
      case "payment_intent.succeeded": {
        if (!account) break;
        const intent = event.data.object as Stripe.PaymentIntent;
        const chargeId =
          typeof intent.latest_charge === "string"
            ? intent.latest_charge
            : intent.latest_charge?.id ?? null;

        let feeCents = 0;
        if (chargeId) {
          const charge = await stripe().charges.retrieve(
            chargeId,
            { expand: ["balance_transaction"] },
            { stripeAccount: account },
          );
          const balance = charge.balance_transaction;
          if (balance && typeof balance !== "string") feeCents = balance.fee;
        }

        await recordOnlineGift({
          accountId: account,
          paymentIntentId: intent.id,
          chargeId,
          amountCents: intent.amount_received || intent.amount,
          feeCents,
          currency: intent.currency,
          receivedOn: new Date(intent.created * 1000).toISOString().slice(0, 10),
          fundId: intent.metadata?.fundId || null,
          memberId: intent.metadata?.memberId || null,
          coveredFee: intent.metadata?.coveredFee === "true",
          giverName: intent.metadata?.giverName || null,
          giverEmail: intent.metadata?.giverEmail || null,
        });
        break;
      }

      /*
       * R13.3. A repeating gift was set up, or Stripe collected it again.
       *
       * The subscription is written down so the church can see what it is
       * expecting, and every collection still lands in gifts as its own row,
       * because that is what a statement is built from.
       */
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        if (!account) break;
        const sub = event.data.object as Stripe.Subscription;
        const item = sub.items.data[0];
        await saveRecurring({
          accountId: account,
          subscriptionId: sub.id,
          customerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
          amountCents: item?.price.unit_amount ?? 0,
          currency: sub.currency,
          interval: item?.price.recurring?.interval ?? "month",
          status: sub.status,
          startedOn: new Date(sub.created * 1000).toISOString().slice(0, 10),
          fundId: sub.metadata?.fundId || null,
          giverName: sub.metadata?.giverName || null,
          giverEmail: sub.metadata?.giverEmail || null,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await markRecurring({ subscriptionId: sub.id, status: "canceled" });
        break;
      }

      /*
       * R13.3. A collection on a repeating gift.
       *
       * The first one arrives as a payment intent too, which is why this is
       * keyed on the intent: the two events describe one payment and the
       * unique index on the intent keeps it one row.
       */
      case "invoice.paid": {
        if (!account) break;
        const invoice = event.data.object as Stripe.Invoice & {
          payment_intent?: string | { id: string } | null;
          subscription?: string | { id: string } | null;
          charge?: string | { id: string } | null;
        };
        const intentId =
          typeof invoice.payment_intent === "string"
            ? invoice.payment_intent
            : invoice.payment_intent?.id ?? null;
        if (!intentId) break;

        const subId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id ?? null;

        let feeCents = 0;
        const chargeId =
          typeof invoice.charge === "string" ? invoice.charge : invoice.charge?.id ?? null;
        if (chargeId) {
          const charge = await stripe().charges.retrieve(
            chargeId,
            { expand: ["balance_transaction"] },
            { stripeAccount: account },
          );
          const balance = charge.balance_transaction;
          if (balance && typeof balance !== "string") feeCents = balance.fee;
        }

        const metadata = subId
          ? (
              await stripe().subscriptions.retrieve(subId, {}, { stripeAccount: account })
            ).metadata
          : {};

        await recordOnlineGift({
          accountId: account,
          paymentIntentId: intentId,
          chargeId,
          amountCents: invoice.amount_paid,
          feeCents,
          currency: invoice.currency,
          receivedOn: new Date(invoice.created * 1000).toISOString().slice(0, 10),
          fundId: metadata?.fundId || null,
          coveredFee: metadata?.coveredFee === "true",
          giverName: metadata?.giverName || null,
          giverEmail: metadata?.giverEmail || invoice.customer_email || null,
        });
        break;
      }

      default:
        break;
    }
  } catch {
    // Stripe retries on anything but a 2xx, which is what we want when the
    // database was briefly unreachable.
    return new NextResponse("Retry", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
