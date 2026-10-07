import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  markStripeAccount, recordOnlineGift, saveRecurring, markRecurring,
} from "@connectapp/db";
import { stripe, stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * R13.4. "fundId:cents;fundId:cents" as the giving page wrote it.
 *
 * Anything malformed comes back empty, and the gift lands whole on the fund
 * the payment named, because a gift that arrived has to be recorded.
 */
function splitFrom(value: string | undefined | null): { fundId: string; cents: number }[] {
  if (!value) return [];
  return value
    .split(";")
    .map((part) => {
      const [fundId, cents] = part.split(":");
      const amount = Number(cents);
      return fundId && Number.isInteger(amount) && amount > 0
        ? { fundId, cents: amount }
        : null;
    })
    .filter((part): part is { fundId: string; cents: number } => part !== null);
}

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

        /*
         * R13.3. A collection on a repeating gift arrives twice: once as this
         * payment and once as the invoice that raised it. Only the invoice
         * knows who gave and what for, because that lives on the
         * subscription, so a payment this product did not write metadata onto
         * is left to the invoice below.
         */
        if (!intent.metadata?.fundId) break;
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
          split: splitFrom(intent.metadata?.split),
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
          intervalCount: item?.price.recurring?.interval_count ?? 1,
          status: sub.status,
          startedOn: new Date(sub.created * 1000).toISOString().slice(0, 10),
          fundId: sub.metadata?.fundId || null,
          giverName: sub.metadata?.giverName || null,
          giverEmail: sub.metadata?.giverEmail || null,
        });
        break;
      }

      /*
       * R13.8. A card expired, or the bank said no.
       *
       * Stripe retries on its own schedule and tells the giver. What this is
       * for is the church: a repeating gift that has stopped collecting shows
       * on the giving screen rather than being noticed in March.
       */
      case "invoice.payment_failed": {
        const failed = event.data.object as Stripe.Invoice & {
          subscription?: string | { id: string } | null;
        };
        const subId =
          typeof failed.subscription === "string"
            ? failed.subscription
            : failed.subscription?.id ?? null;
        if (subId) await markRecurring({ subscriptionId: subId, status: "past_due" });
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
        const paid = event.data.object as Stripe.Invoice;

        /*
         * R13.3. An invoice no longer names its subscription or its payment
         * at the top level: the subscription and its metadata sit under
         * `parent`, and the payment is one of `payments`, which has to be
         * asked for. Both are read here rather than guessed at.
         */
        const subscription = paid.parent?.subscription_details;
        const metadata = subscription?.metadata ?? {};

        const full = await stripe().invoices.retrieve(
          paid.id as string,
          { expand: ["payments"] },
          { stripeAccount: account },
        );
        const payment = full.payments?.data?.[0]?.payment;
        const intentId =
          payment && payment.type === "payment_intent"
            ? typeof payment.payment_intent === "string"
              ? payment.payment_intent
              : payment.payment_intent?.id ?? null
            : null;
        if (!intentId) break;

        /* The fee Stripe took, which the church pays and reconciles against. */
        let feeCents = 0;
        let chargeId: string | null = null;
        const intent = await stripe().paymentIntents.retrieve(
          intentId,
          { expand: ["latest_charge.balance_transaction"] },
          { stripeAccount: account },
        );
        const charge = intent.latest_charge;
        if (charge && typeof charge !== "string") {
          chargeId = charge.id;
          const balance = charge.balance_transaction;
          if (balance && typeof balance !== "string") feeCents = balance.fee;
        }

        await recordOnlineGift({
          accountId: account,
          paymentIntentId: intentId,
          chargeId,
          amountCents: paid.amount_paid,
          feeCents,
          currency: paid.currency,
          receivedOn: new Date(paid.created * 1000).toISOString().slice(0, 10),
          fundId: metadata.fundId || null,
          split: splitFrom(metadata.split),
          coveredFee: metadata.coveredFee === "true",
          giverName: metadata.giverName || null,
          giverEmail: metadata.giverEmail || paid.customer_email || null,
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
