"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { withTenant, getChurch, getStripeAccount, saveStripeAccount } from "@connectapp/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";
import { stripe, stripeConfigured } from "@/lib/stripe";

export interface ConnectResult {
  error?: string;
  /** Where to send the reader to carry on with Stripe. */
  url?: string;
}

async function context(church?: string) {
  const session = await requireSession(church);
  const who = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };
  return { session, actor: who, ctx: who };
}

/**
 * Whether this platform is talking to Stripe for real.
 *
 * Read off the key rather than the account, because a test key can only ever
 * create a test account and the two can never disagree.
 */
const liveKey = (): boolean => Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_live"));

/**
 * Where Stripe sends the church back to.
 *
 * Read from the request rather than from configuration, so a church on its own
 * domain returns to its own domain and nobody has to keep a list of them.
 */
async function origin(): Promise<string> {
  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host") ?? "localhost:4488";
  const proto = head.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * R13.1. Connecting the church's own Stripe account.
 *
 * The account is created with the church as the account holder and this
 * platform as the one that introduced it. ConnectApp never becomes the merchant
 * of record, never holds a balance, and takes no application fee. Stripe asks
 * the church for its own details, its own bank account and its own tax status,
 * and the link below is where it answers.
 */
export async function connectStripe(church?: string): Promise<ConnectResult> {
  const { session, actor, ctx } = await context(church);
  if (!stripeConfigured()) return { error: "stripe.unconfigured" };

  try {
    const existing = await withTenant(ctx, (tx) => getStripeAccount(tx));
    let accountId = existing?.accountId;

    if (!accountId) {
      const profile = await withTenant(ctx, (tx) => getChurch(tx, session.tenantId));
      const account = await stripe().accounts.create({
        type: "standard",
        business_type: "non_profit",
        email: profile?.email ?? undefined,
        company: { name: profile?.legalName || session.tenantName || undefined },
        metadata: { tenantId: session.tenantId, slug: session.tenantSlug },
      });
      accountId = account.id;

      const id = accountId;
      await withTenant(ctx, (tx) =>
        saveStripeAccount(tx, actor, {
          accountId: id,
          chargesEnabled: account.charges_enabled ?? false,
          payoutsEnabled: account.payouts_enabled ?? false,
          detailsSubmitted: account.details_submitted ?? false,
          livemode: liveKey(),
        }),
      );
    }

    const back = `${await origin()}/settings/online?church=${session.tenantSlug}`;
    const link = await stripe().accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: back,
      return_url: back,
    });

    return { url: link.url };
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R13.1. Asking Stripe what the account looks like now. */
export async function refreshStripe(church?: string): Promise<ConnectResult> {
  const { actor, ctx } = await context(church);
  if (!stripeConfigured()) return { error: "stripe.unconfigured" };

  try {
    const existing = await withTenant(ctx, (tx) => getStripeAccount(tx));
    if (!existing) return {};

    const account = await stripe().accounts.retrieve(existing.accountId);
    await withTenant(ctx, (tx) =>
      saveStripeAccount(tx, actor, {
        accountId: account.id,
        chargesEnabled: account.charges_enabled ?? false,
        payoutsEnabled: account.payouts_enabled ?? false,
        detailsSubmitted: account.details_submitted ?? false,
        livemode: liveKey(),
      }),
    );

    revalidatePath("/settings/online");
    revalidatePath("/giving");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R13.1. A one-off link into the church's own Stripe dashboard. */
export async function stripeDashboard(church?: string): Promise<ConnectResult> {
  const { ctx } = await context(church);
  if (!stripeConfigured()) return { error: "stripe.unconfigured" };

  try {
    const existing = await withTenant(ctx, (tx) => getStripeAccount(tx));
    if (!existing) return {};
    // A Standard account signs in to Stripe itself, so this is its own login
    // rather than a link this platform creates.
    return { url: "https://dashboard.stripe.com/" };
  } catch (error) {
    return { error: explain(error) };
  }
}
