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

/**
 * R13.1, R13.2. Writing down a gift that came in through Stripe.
 *
 * Called from the webhook, which arrives with no session and no tenant set, so
 * it cannot go through RLS. It is narrow on purpose: it writes one row against
 * the church the account belongs to, and it is idempotent, because Stripe
 * delivers an event more than once whenever it is unsure.
 */
export async function recordOnlineGift(input: {
  accountId: string;
  paymentIntentId: string;
  chargeId: string | null;
  amountCents: number;
  feeCents: number;
  currency: string;
  receivedOn: string;
  /** From the metadata the giving page put on the payment. */
  fundId?: string | null;
  memberId?: string | null;
  coveredFee?: boolean;
  /** R13.6. What the giver typed on the church's own giving page. */
  giverName?: string | null;
  giverEmail?: string | null;
}): Promise<void> {
  const tenantId = await tenantForStripeAccount(input.accountId);
  if (!tenantId) return;

  const sql = owner();

  /*
   * The fund the giver chose, where the page said so and it still belongs to
   * this church. Anything else lands on the church's first live fund, because
   * a gift that arrived is a gift that has to be recorded.
   */
  const funds = await sql<{ id: string }[]>`
    select id from funds
     where tenant_id = ${tenantId}
       and archived_at is null
       and (${input.fundId ?? null}::uuid is null or id = ${input.fundId ?? null}::uuid)
     order by position asc
     limit 1`;
  const fundId = funds[0]?.id;
  if (!fundId) return;

  /*
   * R13.18. Whoever this is, if the church already has them.
   *
   * Matched on the address they gave Stripe, which is the one they typed on
   * the giving page. No match leaves the gift standing in their own name, and
   * the church can put it against a person later.
   */
  let memberId = input.memberId ?? null;
  const email = input.giverEmail?.trim().toLowerCase() || null;
  if (!memberId && email) {
    const people = await sql<{ id: string }[]>`
      select m.id
        from members m
        join contact_methods c on c.member_id = m.id
       where m.tenant_id = ${tenantId}
         and c.kind = 'email'
         and lower(c.value) = ${email}
         and m.archived_at is null
       limit 2`;
    // Two people on one address is a household sharing it, and guessing which
    // of them gave is worse than leaving it to the church.
    if (people.length === 1) memberId = people[0]!.id;
  }

  await sql`
    insert into gifts (
      tenant_id, member_id, fund_id, amount_cents, currency, method,
      received_on, stripe_payment_intent_id, stripe_charge_id, fee_cents, covered_fee,
      giver_name, giver_email
    )
    values (
      ${tenantId}, ${memberId}, ${fundId}, ${input.amountCents},
      ${input.currency}, 'card', ${input.receivedOn}::date,
      ${input.paymentIntentId}, ${input.chargeId}, ${input.feeCents},
      ${input.coveredFee ?? false},
      ${input.giverName ?? null}, ${email}
    )
    on conflict (tenant_id, stripe_payment_intent_id) do nothing`;
}
