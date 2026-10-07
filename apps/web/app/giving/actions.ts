"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  withTenant, openBatch, updateBatch, closeBatch, reopenBatch,
  recordGift, removeGift, refundGift, attachGift, giftCharge, getStripeAccount,
  getChurch, lookupPeople, personForUser, giverCustomer,
  recurringSubscription, markRecurring, canManageGiving, PermissionError, type GiftMethod,
} from "@connectapp/db";
import { stripe, stripeConfigured, asChurch } from "@/lib/stripe";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";

export interface GivingResult {
  error?: string;
  id?: string;
}

async function context(church?: string) {
  const session = await requireSession(church);
  const who = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };
  return { actor: who, ctx: who };
}

/** R13.10. Opening a count, on what the counters say is in the bag. */
export async function startCount(
  input: {
    name: string;
    receivedOn: string;
    expectedCents: number;
    counterOneId?: string | null;
    counterTwoId?: string | null;
  },
  church?: string,
): Promise<GivingResult> {
  const { actor, ctx } = await context(church);
  try {
    const { id } = await withTenant(ctx, (tx) => openBatch(tx, actor, input));
    revalidatePath("/giving");
    return { id };
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R13.10, R13.11. Changing a count that is still open. */
export async function saveCount(
  id: string,
  input: {
    name?: string;
    receivedOn?: string;
    expectedCents?: number;
    counterOneId?: string | null;
    counterTwoId?: string | null;
  },
  church?: string,
): Promise<GivingResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => updateBatch(tx, actor, id, input));
    revalidatePath(`/giving/counts/${id}`);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R13.11. Closing it, which is what makes it a deposit. */
export async function finishCount(
  id: string,
  varianceNote: string | null,
  church?: string,
): Promise<GivingResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => closeBatch(tx, actor, id, varianceNote));
    revalidatePath(`/giving/counts/${id}`);
    revalidatePath("/giving");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function openAgain(id: string, church?: string): Promise<GivingResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => reopenBatch(tx, actor, id));
    revalidatePath(`/giving/counts/${id}`);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R13.12 to R13.14. A line on the count, or a gift on its own. */
export async function addGift(
  input: {
    memberId?: string | null;
    fundId: string;
    batchId?: string | null;
    amountCents: number;
    method: GiftMethod;
    reference?: string | null;
    receivedOn: string;
    note?: string | null;
    inKindDescription?: string | null;
  },
  church?: string,
): Promise<GivingResult> {
  const { actor, ctx } = await context(church);
  try {
    const { id } = await withTenant(ctx, (tx) => recordGift(tx, actor, input));
    revalidatePath("/giving");
    if (input.batchId) revalidatePath(`/giving/counts/${input.batchId}`);
    return { id };
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R13.15. Taking a line back off a count that is still open. */
export async function dropGift(
  id: string,
  batchId: string | null,
  church?: string,
): Promise<GivingResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => removeGift(tx, actor, id));
    revalidatePath("/giving");
    if (batchId) revalidatePath(`/giving/counts/${batchId}`);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/**
 * R13.15. Giving a gift back.
 *
 * A card gift goes back through Stripe first, on the church's own account, and
 * is written down only once Stripe has agreed to it. A cash gift is written
 * down here and handed over by the church.
 */
export async function giveBack(
  id: string,
  cents: number,
  church?: string,
): Promise<GivingResult> {
  const { actor, ctx } = await context(church);
  try {
    const gift = await withTenant(ctx, (tx) => giftCharge(tx, id));
    if (!gift) return { error: "gift.error.missing" };

    if (gift.chargeId) {
      if (!stripeConfigured()) return { error: "stripe.unconfigured" };
      const account = await withTenant(ctx, (tx) => getStripeAccount(tx));
      if (!account) return { error: "stripe.unconfigured" };

      await stripe().refunds.create(
        { charge: gift.chargeId, amount: cents },
        asChurch(account.accountId),
      );
    }

    await withTenant(ctx, (tx) => refundGift(tx, actor, id, cents));
    revalidatePath("/giving");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R13.18. Saying who a gift was from, where nobody was attached to it. */
export async function nameGiver(
  id: string,
  memberId: string | null,
  church?: string,
): Promise<GivingResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => attachGift(tx, actor, id, memberId));
    revalidatePath("/giving");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export interface GiverHit {
  id: string;
  name: string;
}

/** R13.12. Who gave, looked up as the treasurer types the name. */
export async function findGiver(query: string, church?: string): Promise<GiverHit[]> {
  const session = await requireSession(church);
  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };
  try {
    return await withTenant(ctx, async (tx) => {
      const profile = await getChurch(tx, session.tenantId);
      const asOf = churchNow(profile?.timezone ?? "America/Chicago").date;
      const matches = await lookupPeople(tx, query, { asOf, limit: 10 });
      return matches.map((one) => ({
        id: one.person.id,
        name: `${one.person.name} ${one.person.lastName}`.trim(),
      }));
    });
  } catch {
    return [];
  }
}

/**
 * R13.3, R13.19. A member changes or stops their own repeating gift.
 *
 * Stripe's billing portal, opened against the church's own account for the
 * customer this church already keeps for them. The card lives at Stripe and
 * is changed at Stripe, which is what keeps this product out of PCI scope.
 */
export async function manageMine(church?: string): Promise<{ url?: string; error?: string }> {
  if (!stripeConfigured()) return { error: "stripe.unconfigured" };

  const session = await requireSession(church);
  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  try {
    const self = await withTenant(ctx, (tx) => personForUser(tx, session.userId));
    if (!self) return { error: "give.error.closed" };

    const customer = await giverCustomer(self);
    const account = await withTenant(ctx, (tx) => getStripeAccount(tx));
    if (!customer || !account) return { error: "give.error.closed" };

    const head = await headers();
    const host = head.get("x-forwarded-host") ?? head.get("host") ?? "localhost:4488";
    const proto = head.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

    const portal = await stripe().billingPortal.sessions.create(
      { customer, return_url: `${proto}://${host}/giving?church=${session.tenantSlug}` },
      asChurch(account.accountId),
    );

    return { url: portal.url };
  } catch {
    return { error: "stripe.failed" };
  }
}

/**
 * R13.3, R13.19. Stopping a repeating gift, inside this product.
 *
 * Stripe is told to cancel the subscription on the church's own account, and
 * the row is marked here at once so the screen is right before the webhook
 * lands. Stripe sends `customer.subscription.deleted` as well, which writes
 * the same thing, so the two cannot disagree.
 *
 * A member may stop their own. Anybody who runs the church's giving may stop
 * any of them, because a treasurer is asked to.
 */
export async function stopRepeating(id: string, church?: string): Promise<GivingResult> {
  if (!stripeConfigured()) return { error: "stripe.unconfigured" };

  const session = await requireSession(church);
  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  try {
    const read = await withTenant(ctx, async (tx) => ({
      gift: await recurringSubscription(tx, id),
      self: await personForUser(tx, session.userId),
      account: await getStripeAccount(tx),
    }));

    if (!read.gift || !read.account) return { error: "give.error.closed" };

    const mine = read.self !== null && read.gift.memberId === read.self;
    if (!mine && !canManageGiving(ctx)) throw new PermissionError(ctx.role, "manageGiving");

    await stripe().subscriptions.cancel(
      read.gift.subscriptionId,
      undefined,
      asChurch(read.account.accountId),
    );
    await markRecurring({ subscriptionId: read.gift.subscriptionId, status: "canceled" });

    revalidatePath("/giving");
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
