import { eq } from "drizzle-orm";
import type { Tx } from "../client";
import { owner } from "../client";
import { stripeAccounts } from "../schema/giving";
import { PermissionError, canManageGiving } from "../roles";
import type { WriteActor } from "./members";

/**
 * R13.1. The church's own Stripe account, as this product knows it.
 *
 * The account belongs to the church. It is created through Stripe Connect with
 * the church as the account holder, the money settles to the church's own bank,
 * and every charge carries a platform application fee of zero. Nothing here is
 * a credential: it is an id and what Stripe last said about it.
 */

export interface ChurchStripeAccount {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  livemode: boolean;
}

/** R13.1. What this church is connected to, if anything. */
export async function getStripeAccount(db: Tx): Promise<ChurchStripeAccount | null> {
  const [row] = await db
    .select({
      accountId: stripeAccounts.accountId,
      chargesEnabled: stripeAccounts.chargesEnabled,
      payoutsEnabled: stripeAccounts.payoutsEnabled,
      detailsSubmitted: stripeAccounts.detailsSubmitted,
      livemode: stripeAccounts.livemode,
    })
    .from(stripeAccounts)
    .limit(1);
  return row ?? null;
}

/** R13.1. Writing down the account the church just created, or what it became. */
export async function saveStripeAccount(
  db: Tx,
  actor: WriteActor,
  input: ChurchStripeAccount,
): Promise<void> {
  if (!canManageGiving(actor)) throw new PermissionError(actor.role, "manageGiving");

  const [existing] = await db
    .select({ id: stripeAccounts.id })
    .from(stripeAccounts)
    .limit(1);

  if (existing) {
    await db
      .update(stripeAccounts)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(stripeAccounts.id, existing.id));
    return;
  }

  await db.insert(stripeAccounts).values({ tenantId: actor.tenantId, ...input });
}

/**
 * R13.1. Which church an account belongs to, read with no session.
 *
 * A Stripe webhook arrives with an account id and nothing else: there is no
 * signed-in person and no tenant set, so this is one of the few reads that
 * cannot go through RLS. It returns an id and a flag, never a record.
 */
export async function tenantForStripeAccount(accountId: string): Promise<string | null> {
  const rows = await owner()<{ tenantId: string }[]>`
    select tenant_id as "tenantId" from stripe_accounts where account_id = ${accountId} limit 1`;
  return rows[0]?.tenantId ?? null;
}

/** R13.1. What Stripe says about the account now, written from a webhook. */
export async function markStripeAccount(input: {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}): Promise<void> {
  await owner()`
    update stripe_accounts
       set charges_enabled = ${input.chargesEnabled},
           payouts_enabled = ${input.payoutsEnabled},
           details_submitted = ${input.detailsSubmitted},
           updated_at = now()
     where account_id = ${input.accountId}`;
}
