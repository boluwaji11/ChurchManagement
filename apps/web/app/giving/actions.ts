"use server";

import { revalidatePath } from "next/cache";
import {
  withTenant, openBatch, updateBatch, closeBatch, reopenBatch,
  recordGift, removeGift, refundGift, giftCharge, getStripeAccount,
  getChurch, lookupPeople, type GiftMethod,
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
