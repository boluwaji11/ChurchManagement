import { desc, eq, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { owner } from "../client";
import { funds, recurringGifts } from "../schema/giving";
import { members } from "../schema/members";
import { canReadGivingAmounts } from "../roles";
import type { WriteActor } from "./members";

/**
 * R13.3. The gifts that repeat.
 *
 * The giver sets one up on the church's giving page and changes or stops it
 * through Stripe, without ringing the church office. What is here is the
 * church's view of it: who, how much, how often, and whether Stripe is still
 * collecting it.
 */

export interface Recurring {
  id: string;
  name: string;
  fundName: string | null;
  amountCents: number;
  interval: string;
  status: string;
  startedOn: string | null;
}

/** R13.3. What this church is expecting, largest first. */
export async function listRecurring(
  db: Tx,
  who: WriteActor,
  options: { activeOnly?: boolean } = {},
): Promise<Recurring[]> {
  const rows = await db
    .select({
      id: recurringGifts.id,
      first: members.firstName,
      last: members.lastName,
      giverName: recurringGifts.giverName,
      fundName: funds.name,
      amountCents: recurringGifts.amountCents,
      interval: recurringGifts.interval,
      status: recurringGifts.status,
      startedOn: sql<string | null>`${recurringGifts.startedOn}::text`,
    })
    .from(recurringGifts)
    .leftJoin(members, eq(members.id, recurringGifts.memberId))
    .leftJoin(funds, eq(funds.id, recurringGifts.fundId))
    /*
     * R13.8. A gift that has stopped collecting belongs on the same list as
     * the ones that are collecting, because that is where somebody will see
     * it. Only a cancelled one drops off.
     */
    .where(options.activeOnly ? sql`${recurringGifts.status} <> 'canceled'` : undefined)
    .orderBy(desc(recurringGifts.amountCents));

  const amounts = canReadGivingAmounts(who);

  return rows.map((row) => ({
    id: row.id,
    name: [row.first, row.last].filter(Boolean).join(" ") || row.giverName || "",
    fundName: row.fundName,
    amountCents: amounts ? row.amountCents : 0,
    interval: row.interval,
    status: row.status,
    startedOn: row.startedOn,
  }));
}

/** R13.3. What the church is expecting a month, from everything still running. */
export async function recurringMonthly(db: Tx): Promise<number> {
  const [row] = await db
    .select({
      cents: sql<number>`coalesce(sum(
        case when ${recurringGifts.interval} = 'week'
          then ${recurringGifts.amountCents} * 52 / 12
          else ${recurringGifts.amountCents}
        end
      ), 0)::int`,
    })
    .from(recurringGifts)
    .where(eq(recurringGifts.status, "active"));
  return row?.cents ?? 0;
}

/**
 * R13.3. Writing down a subscription Stripe has told us about.
 *
 * Called from the webhook, which has no session and no tenant set, so it goes
 * through the owner connection the same way an online gift does. Idempotent on
 * the subscription id, because Stripe redelivers.
 */
export async function saveRecurring(input: {
  accountId: string;
  subscriptionId: string;
  customerId: string | null;
  amountCents: number;
  currency: string;
  interval: string;
  status: string;
  startedOn: string;
  fundId?: string | null;
  giverName?: string | null;
  giverEmail?: string | null;
}): Promise<void> {
  const sql = owner();
  const rows = await sql<{ tenantId: string }[]>`
    select tenant_id as "tenantId" from stripe_accounts
     where account_id = ${input.accountId} limit 1`;
  const tenantId = rows[0]?.tenantId;
  if (!tenantId) return;

  const email = input.giverEmail?.trim().toLowerCase() || null;
  let memberId: string | null = null;
  if (email) {
    const people = await sql<{ id: string }[]>`
      select m.id from members m
        join contact_methods c on c.member_id = m.id
       where m.tenant_id = ${tenantId}
         and c.kind = 'email'
         and lower(c.value) = ${email}
         and m.archived_at is null
       limit 2`;
    if (people.length === 1) memberId = people[0]!.id;
  }

  await sql`
    insert into recurring_gifts (
      tenant_id, member_id, giver_name, giver_email, fund_id, amount_cents,
      currency, interval, stripe_subscription_id, stripe_customer_id, status, started_on
    )
    values (
      ${tenantId}, ${memberId}, ${input.giverName ?? null}, ${email},
      ${input.fundId ?? null}::uuid, ${input.amountCents}, ${input.currency},
      ${input.interval}, ${input.subscriptionId}, ${input.customerId},
      ${input.status}, ${input.startedOn}::date
    )
    on conflict (stripe_subscription_id) do update
      set amount_cents = excluded.amount_cents,
          interval = excluded.interval,
          status = excluded.status,
          updated_at = now()`;
}

/** R13.3. Stripe says it has stopped, or changed. */
export async function markRecurring(input: {
  subscriptionId: string;
  status: string;
  amountCents?: number;
}): Promise<void> {
  const sql = owner();
  await sql`
    update recurring_gifts
       set status = ${input.status},
           amount_cents = coalesce(${input.amountCents ?? null}, amount_cents),
           cancelled_at = case when ${input.status} = 'canceled' then now() else null end,
           updated_at = now()
     where stripe_subscription_id = ${input.subscriptionId}`;
}

/** R13.3. Which church a subscription belongs to, for a read with no session. */
export async function tenantForSubscription(subscriptionId: string): Promise<string | null> {
  const rows = await owner()<{ tenantId: string }[]>`
    select tenant_id as "tenantId" from recurring_gifts
     where stripe_subscription_id = ${subscriptionId} limit 1`;
  return rows[0]?.tenantId ?? null;
}
