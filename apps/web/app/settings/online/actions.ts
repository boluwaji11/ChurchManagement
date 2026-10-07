"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { withTenant, getChurch, getStripeAccount, saveStripeAccount } from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";
import { stripe, stripeConfigured, asChurch } from "@/lib/stripe";


/**
 * R13.1. A website Stripe will accept, or nothing.
 *
 * A church writes "example.com" rather than a scheme, so one is put in front
 * of it. Anything that is not a plain web address with a real host is left
 * out: Stripe answers "Invalid URL" and refuses the whole account, and the
 * church is then stuck on a screen with no way past it.
 */
function webAddress(given: string | null | undefined): string | undefined {
  const site = given?.trim();
  if (!site) return undefined;

  const full = /^https?:\/\//i.test(site) ? site : `https://${site}`;
  try {
    const url = new URL(full);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    if (!url.hostname.includes(".") || url.hostname.endsWith(".")) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

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
      const name = profile?.legalName || profile?.name || session.tenantName || "Church";

      /*
       * R13.1. An Accounts v2 account with the merchant configuration and the
       * full Stripe dashboard, which is what used to be called a Standard
       * account: the church is the merchant of record, it signs in to Stripe
       * itself, and Stripe collects the fees and carries the losses. The
       * platform is named on the account and takes nothing from it.
       *
       * `non_profit` is a first-class entity type here, so a church is
       * described to Stripe as what it is.
       */
      /*
       * R13.1, R22.x. Everything the church has already told us goes with it.
       *
       * Stripe's form asks for the name, the address, the website, the trade
       * and a description of what the money is for. A church has answered all
       * of that on its own profile, and asking a volunteer the same questions
       * again is how a ten-minute job becomes an abandoned one. What we cannot
       * know, the EIN, the representative, the bank, Stripe asks for itself.
       */
      const address = profile?.addressLine1
        ? {
            line1: profile.addressLine1,
            line2: profile.addressLine2 ?? undefined,
            city: profile.city ?? undefined,
            state: profile.region ?? undefined,
            postal_code: profile.postalCode ?? undefined,
            country: (profile.country || "US").toUpperCase(),
          }
        : undefined;

      /*
       * R13.1. The church's own website, where it reaches Stripe's standard
       * for one. Stripe refuses an address it cannot make sense of and
       * refuses the whole account with it, so a website nobody can reach is
       * left out rather than taking the church's onboarding down with it.
       */
      const website = webAddress(profile?.website);

      const prefill = {
        display_name: name,
        contact_email: profile?.email ?? undefined,
        dashboard: "full" as const,
        identity: {
          country: (profile?.country || "US").toLowerCase(),
          entity_type: "non_profit" as const,
          business_details: {
            registered_name: name,
            ...(address ? { address } : {}),
            ...(profile?.phone ? { phone: profile.phone } : {}),
          },
        },
        configuration: {
          merchant: {
            capabilities: {
              card_payments: { requested: true },
              /*
               * R13.1. A bank debit costs a church 0.8% capped at $5, against
               * 2.2% and 30c on a card. On a four-figure gift that is the
               * difference between $5 and $90, so it is asked for from the
               * first moment rather than left for somebody to discover.
               */
              ach_debit_payments: { requested: true },
            },
            // 8661 is the merchant category for a religious organisation,
            // which is what every church on this platform is.
            mcc: "8661",
            support: {
              ...(profile?.email ? { email: profile.email } : {}),
              ...(profile?.phone ? { phone: profile.phone } : {}),
              ...(website ? { url: website } : {}),
              ...(address ? { address } : {}),
            },
          },
        },
        defaults: {
          currency: "usd" as const,
          responsibilities: {
            fees_collector: "stripe" as const,
            losses_collector: "stripe" as const,
          },
          locales: ["en-US"],
          profile: {
            doing_business_as: profile?.name || name,
            ...(website ? { business_url: website } : {}),
            product_description: t("stripe.description", { church: profile?.name || name }),
          },
        },
        metadata: { tenantId: session.tenantId, slug: session.tenantSlug },
      };

      /*
       * Everything above is a kindness: it saves a volunteer typing what this
       * product already holds. Where Stripe will not take one of those
       * answers, the church still gets its account and fills that one in on
       * Stripe's own form.
       */
      let account;
      try {
        account = await stripe().v2.core.accounts.create(prefill);
      } catch (refused) {
        console.error("[stripe] account refused with what we filled in", refused);
        account = await stripe().v2.core.accounts.create({
          display_name: prefill.display_name,
          contact_email: prefill.contact_email,
          dashboard: "full",
          identity: { country: prefill.identity.country, entity_type: "non_profit" },
          configuration: {
            merchant: {
              capabilities: prefill.configuration.merchant.capabilities,
              mcc: "8661",
            },
          },
          defaults: {
            currency: "usd",
            responsibilities: { fees_collector: "stripe", losses_collector: "stripe" },
            locales: ["en-US"],
          },
          metadata: prefill.metadata,
        });
      }
      accountId = account.id;

      /*
       * What Stripe will let the account do reads off the v1 view of it, which
       * accepts a v2 id and answers in the shape the rest of this product and
       * the webhook already speak.
       */
      const state = await stripe().accounts.retrieve(accountId);
      const id = accountId;
      await withTenant(ctx, (tx) =>
        saveStripeAccount(tx, actor, {
          accountId: id,
          chargesEnabled: state.charges_enabled ?? false,
          payoutsEnabled: state.payouts_enabled ?? false,
          detailsSubmitted: state.details_submitted ?? false,
          livemode: liveKey(),
        }),
      );
    }

    const here = `${await origin()}/settings/online?church=${session.tenantSlug}`;
    /*
     * R13.1. Coming back says so, so the screen can ask Stripe what the
     * account looks like now rather than showing what it looked like before
     * the church filled the form in.
     */
    const link = await stripe().accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: here,
      return_url: `${here}&from=stripe`,
    });

    return { url: link.url };
  } catch (error) {
    return { error: explain(error) };
  }
}

/**
 * R13.1. Asking Stripe what the account looks like now, and writing it down.
 *
 * Separate from the action below because a screen rendering on the way back
 * from Stripe calls it too, and a render may not ask for a revalidation.
 */
export async function syncStripe(church?: string): Promise<ConnectResult> {
  const { actor, ctx } = await context(church);
  if (!stripeConfigured()) return { error: "stripe.unconfigured" };

  try {
    const existing = await withTenant(ctx, (tx) => getStripeAccount(tx));
    if (!existing) return {};

    const account = await stripe().accounts.retrieve(existing.accountId);
    if (account.charges_enabled) await allowBankDebits(existing.accountId);

    await withTenant(ctx, (tx) =>
      saveStripeAccount(tx, actor, {
        accountId: account.id,
        chargesEnabled: account.charges_enabled ?? false,
        payoutsEnabled: account.payouts_enabled ?? false,
        detailsSubmitted: account.details_submitted ?? false,
        livemode: liveKey(),
      }),
    );

    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R13.1. The same, from a press, which puts the screens right afterwards. */
export async function refreshStripe(church?: string): Promise<ConnectResult> {
  const answer = await syncStripe(church);
  if (!answer.error) {
    revalidatePath("/settings/online");
    revalidatePath("/giving");
  }
  return answer;
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

export interface AccountFace {
  /** What Stripe holds as the church's name. */
  name: string | null;
  /** Where the money lands, as a church would say it. */
  bank: string | null;
  /** How often Stripe pays out: daily, weekly, monthly or manual. */
  payouts: string | null;
}

/**
 * R13.1. What a church recognises about its own account.
 *
 * The id is a token for support; a treasurer knows their church's name and
 * the last four digits of the account the money lands in. One call, on a
 * settings screen that is opened rarely.
 */
export async function accountFace(church?: string): Promise<AccountFace> {
  const { ctx } = await context(church);
  const nothing = { name: null, bank: null, payouts: null };
  if (!stripeConfigured()) return nothing;

  try {
    const held = await withTenant(ctx, (tx) => getStripeAccount(tx));
    if (!held) return nothing;

    const account = await stripe().accounts.retrieve(held.accountId, {
      expand: ["external_accounts"],
    });

    const external = account.external_accounts?.data?.[0];
    const bank =
      external && external.object === "bank_account"
        ? [external.bank_name, external.last4 ? `••••${external.last4}` : null]
            .filter(Boolean)
            .join(" ")
        : null;

    return {
      name: account.business_profile?.name ?? account.settings?.dashboard?.display_name ?? null,
      bank: bank || null,
      payouts: account.settings?.payouts?.schedule?.interval ?? null,
    };
  } catch {
    return nothing;
  }
}

/**
 * R13.1. Switch bank debits on for a church that can take them.
 *
 * Stripe decides which methods a checkout offers from the account's own
 * payment method settings, and it ships with bank debits off. A church is
 * better off with them on: 0.8% capped at $5 against 2.2% and 30c, which on
 * a four-figure gift is the difference between $5 and $90.
 *
 * Quiet on failure. A church whose account cannot take bank debits yet still
 * has a working card page, and Stripe asks it for whatever it needs.
 */
async function allowBankDebits(accountId: string): Promise<void> {
  try {
    /*
     * Two things have to be true: Stripe has to let the account take bank
     * debits at all, and the account's own settings have to offer them. An
     * account made before this was asked for has neither.
     */
    const account = await stripe().accounts.retrieve(accountId);
    if (account.capabilities?.us_bank_account_ach_payments !== "active") {
      await stripe().accounts.update(accountId, {
        capabilities: { us_bank_account_ach_payments: { requested: true } },
      });
    }

    const configs = await stripe().paymentMethodConfigurations.list(
      {},
      asChurch(accountId),
    );
    const theirs = configs.data.find(
      (one) => one.is_default && one.us_bank_account?.display_preference.overridable,
    );
    if (!theirs || theirs.us_bank_account?.display_preference.value === "on") return;

    await stripe().paymentMethodConfigurations.update(
      theirs.id,
      { us_bank_account: { display_preference: { preference: "on" } } },
      asChurch(accountId),
    );
  } catch {
    // Nothing to tell the church: the card page works either way.
  }
}
