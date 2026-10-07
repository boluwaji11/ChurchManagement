"use server";

import { headers } from "next/headers";
import { givingPage } from "@connectapp/db";
import { stripe, stripeConfigured, asChurch, PLATFORM_FEE, withFee } from "@/lib/stripe";

export interface GiveResult {
  error?: string;
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
  amountCents: number;
  coverFee: boolean;
  name: string;
  email: string;
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

  const charged = input.coverFee ? withFee(input.amountCents) : input.amountCents;
  const back = await origin();

  try {
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        customer_email: email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: charged,
              product_data: { name: `${page.name} · ${fund.name}` },
            },
          },
        ],
        /*
         * R13.1. No application fee. The platform takes nothing, and this
         * line is here so that a change to it is a change somebody made.
         */
        payment_intent_data: {
          ...(PLATFORM_FEE > 0 ? { application_fee_amount: PLATFORM_FEE } : {}),
          description: `${fund.name}`,
          metadata: {
            fundId: fund.id,
            coveredFee: String(input.coverFee),
            giverName: input.name.trim().slice(0, 120),
            giverEmail: email,
          },
        },
        success_url: `${back}/give/${page.slug}/thanks`,
        cancel_url: `${back}/give/${page.slug}`,
      },
      asChurch(page.accountId),
    );

    return { url: session.url ?? undefined };
  } catch {
    return { error: "stripe.failed" };
  }
}
