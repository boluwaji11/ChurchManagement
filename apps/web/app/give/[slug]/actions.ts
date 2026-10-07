"use server";

import { headers } from "next/headers";
import {
  givingPage, giverKnown, giverMember, giverCustomer, rememberCustomer,
} from "@connectapp/db";
import { stripe, stripeConfigured, asChurch, PLATFORM_FEE, withFee } from "@/lib/stripe";
import { EVERY, type Repeat } from "./repeats";

export interface GiveResult {
  error?: string;
  /**
   * R13.2. What the browser needs to draw Stripe's payment fields inside our
   * own page. The card goes from the giver to Stripe; this server never sees
   * it, which is what keeps every church here in PCI scope SAQ-A.
   */
  secret?: string;
  /** Where Stripe's own hosted page is, for a browser that cannot run theirs. */
  url?: string;
}

/** What a church will take in one gift, so a typo cannot create a $90,000 charge. */
const MOST = 2_000_000;
const LEAST = 100;

async function origin(): Promise<string> {
  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host") ?? "localhost:4488";
  const proto = head.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * R13.2, R13.5, R13.6. Taking the giver to Stripe to pay.
 *
 * The session is created **on the church's own account**, so the church is the
 * merchant of record, the money settles to the church's bank, and ConnectApp's
 * application fee is zero. The card itself is typed into Stripe's page, which
 * is why nothing here reads a card number.
 */
export async function startGift(input: {
  slug: string;
  fundId: string;
  /**
   * R13.4. Where the giver split it, what each fund takes, in whole cents.
   * Left out, the whole gift goes to `fundId`.
   */
  split?: { fundId: string; cents: number }[];
  amountCents: number;
  coverFee: boolean;
  name: string;
  email: string;
  /** R13.3. Once, or on whatever rhythm the giver keeps. */
  repeat?: Repeat;
}): Promise<GiveResult> {
  if (!stripeConfigured()) return { error: "stripe.unconfigured" };

  const page = await givingPage(input.slug);
  if (!page) return { error: "give.error.closed" };

  const fund = page.funds.find((one) => one.id === input.fundId);
  if (!fund) return { error: "give.error.fund" };

  if (!Number.isInteger(input.amountCents) || input.amountCents < LEAST || input.amountCents > MOST) {
    return { error: "give.error.amount" };
  }

  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return { error: "give.error.email" };

  /*
   * R13.4. A split has to add up to the gift, and every fund in it has to be
   * one this church is receiving to. Anything else is treated as no split.
   */
  const split = (input.split ?? []).filter(
    (part) => part.cents > 0 && page.funds.some((one) => one.id === part.fundId),
  );
  const splitTotal = split.reduce((sum, part) => sum + part.cents, 0);
  const shares = split.length > 1 && splitTotal === input.amountCents ? split : [];

  const charged = input.coverFee ? withFee(input.amountCents) : input.amountCents;
  const back = await origin();

  /*
   * R13.2. A giver this church already knows is offered their own card back
   * rather than being asked to type it again. The customer lives on the
   * church's own Stripe account, and nothing about the card itself comes
   * near this server: Stripe keeps it and hands back a handle.
   */
  const memberId = await giverMember(page.slug, email);
  let customer = memberId ? await giverCustomer(memberId) : null;

  if (memberId && !customer) {
    try {
      const made = await stripe().customers.create(
        { email, name: input.name.trim() || undefined },
        asChurch(page.accountId),
      );
      customer = made.id;
      await rememberCustomer(memberId, customer);
    } catch {
      customer = null;
    }
  }

  const repeat: Repeat = input.repeat ?? "once";
  const every = repeat === "once" ? null : EVERY[repeat];
  const metadata = {
    fundId: fund.id,
    // "fundId:cents;fundId:cents". Short enough for Stripe's 500 characters
    // at the eight funds a giving page offers to split across.
    split: shares.map((part) => `${part.fundId}:${part.cents}`).join(";"),
    coveredFee: String(input.coverFee),
    giverName: input.name.trim().slice(0, 120),
    giverEmail: email,
  };

  try {
    const session = await stripe().checkout.sessions.create(
      {
        mode: repeat === "once" ? "payment" : "subscription",
        // A customer where the church knows them, and the address alone
        // where it does not. Stripe refuses both at once.
        ...(customer ? { customer } : { customer_email: email }),
        /*
         * R13.2. Offer to keep the card for next time, and offer the saved
         * one back. Stripe asks the giver; a card is never kept quietly.
         */
        ...(repeat === "once" && customer
          ? {
              saved_payment_method_options: {
                payment_method_save: "enabled" as const,
                allow_redisplay_filters: ["always", "limited", "unspecified"] as const,
              },
            }
          : {}),
        /*
         * R13.4. The giver sees what they chose, fund by fund, on Stripe's
         * own page. The fee they offered to cover rides on the first line.
         */
        line_items: (shares.length > 0
          ? shares.map((part, at) => ({
              fund: page.funds.find((one) => one.id === part.fundId)!.name,
              cents: at === 0 ? part.cents + (charged - input.amountCents) : part.cents,
            }))
          : [{ fund: fund.name, cents: charged }]
        ).map((line) => ({
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: line.cents,
            product_data: { name: `${page.name} · ${line.fund}` },
            ...(every
              ? { recurring: { interval: every.interval, interval_count: every.count } }
              : {}),
          },
        })),
        /*
         * R13.1. No application fee. The platform takes nothing, and this
         * line is here so that a change to it is a change somebody made.
         */
        ...(repeat === "once"
          ? {
              payment_intent_data: {
                ...(PLATFORM_FEE > 0 ? { application_fee_amount: PLATFORM_FEE } : {}),
                description: fund.name,
                metadata,
              },
            }
          : {
              /*
               * R13.3. The same rule on a subscription: no application fee, so
               * every collection settles to the church with Stripe's own fee
               * taken off the church's balance and nothing taken off ours.
               */
              subscription_data: { metadata },
            }),
        metadata,
        /*
         * R13.6. Drawn inside the church's own page rather than on Stripe's.
         * A giver standing in a car park should answer one question and be
         * done, and a redirect to another domain is where people stop.
         */
        ui_mode: "embedded_page" as never,
        return_url: `${back}/give/${page.slug}/thanks?session={CHECKOUT_SESSION_ID}`,
      },
      asChurch(page.accountId),
    );

    return { secret: session.client_secret ?? undefined };
  } catch (error) {
    // The giver is told it did not go through; the reason belongs in the log,
    // where whoever is running this can read it.
    console.error("[give] checkout session refused", error);
    return { error: "stripe.failed" };
  }
}

/**
 * R13.3. The giver's own way to change or stop a repeating gift.
 *
 * Stripe's billing portal, opened for the customer that this checkout session
 * belongs to. The session id is the key: the giver has just been handed it by
 * Stripe and nobody else has it, so it stands in for a sign-in on a page where
 * there are no accounts. It is spent as soon as they leave the page.
 */
export async function manageGiving(slug: string, sessionId: string): Promise<GiveResult> {
  if (!stripeConfigured()) return { error: "stripe.unconfigured" };
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return { error: "give.error.closed" };

  const page = await givingPage(slug);
  if (!page) return { error: "give.error.closed" };

  try {
    const checkout = await stripe().checkout.sessions.retrieve(
      sessionId,
      {},
      asChurch(page.accountId),
    );
    const customer =
      typeof checkout.customer === "string" ? checkout.customer : checkout.customer?.id;
    if (!customer) return { error: "give.error.closed" };

    const back = await origin();
    const portal = await stripe().billingPortal.sessions.create(
      { customer, return_url: `${back}/give/${page.slug}` },
      asChurch(page.accountId),
    );

    return { url: portal.url };
  } catch {
    return { error: "stripe.failed" };
  }
}

/**
 * R13.6. What the giver just did, read from the session Stripe handed them.
 *
 * The address comes from Stripe rather than from the page's own query string,
 * so nobody can ask this about somebody else's.
 */
export async function giftSession(
  slug: string,
  sessionId: string,
): Promise<{ repeating: boolean; email: string | null; known: boolean }> {
  const nothing = { repeating: false, email: null, known: false };
  if (!stripeConfigured() || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return nothing;

  const page = await givingPage(slug);
  if (!page) return nothing;

  try {
    const checkout = await stripe().checkout.sessions.retrieve(
      sessionId,
      {},
      asChurch(page.accountId),
    );
    const email = checkout.customer_details?.email ?? checkout.customer_email ?? null;

    return {
      repeating: checkout.mode === "subscription",
      email,
      known: email ? await giverKnown(slug, email) : false,
    };
  } catch {
    return nothing;
  }
}
