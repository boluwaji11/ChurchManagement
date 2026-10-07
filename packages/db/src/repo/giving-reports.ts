import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { funds, gifts } from "../schema/giving";
import { members } from "../schema/members";
import { PermissionError, canReadGivingAmounts } from "../roles";
import type { WriteActor } from "./members";

/**
 * R13.24, R13.25. What a church reads back about its giving.
 *
 * The lapsed donor report is the one that earns its place: somebody who gave
 * every month last year and has given nothing since March is a pastoral
 * question before it is a financial one, and no church notices on its own.
 */

export interface Point {
  key: string;
  label: string;
  value: number;
}

/** R13.21. What came in each month across the window. */
export async function givingByMonth(
  db: Tx,
  range: { from: string; to: string },
): Promise<Point[]> {
  const rows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${gifts.receivedOn}), 'YYYY-MM')`,
      cents: sql<number>`coalesce(sum(${gifts.amountCents} - ${gifts.refundedCents}), 0)::int`,
    })
    .from(gifts)
    .where(
      and(
        sql`${gifts.receivedOn} >= ${range.from}::date`,
        sql`${gifts.receivedOn} <= ${range.to}::date`,
      ),
    )
    .groupBy(sql`date_trunc('month', ${gifts.receivedOn})`)
    .orderBy(asc(sql`date_trunc('month', ${gifts.receivedOn})`));

  return rows.map((row) => ({ key: row.month, label: row.month, value: row.cents }));
}

/** R13.21. What each fund took across the window, largest first. */
export async function givingByFund(
  db: Tx,
  range: { from: string; to: string },
): Promise<{ id: string; name: string; restricted: boolean; cents: number }[]> {
  const rows = await db
    .select({
      id: funds.id,
      name: funds.name,
      restricted: funds.restricted,
      cents: sql<number>`coalesce(sum(${gifts.amountCents} - ${gifts.refundedCents}), 0)::int`,
    })
    .from(gifts)
    .innerJoin(funds, eq(funds.id, gifts.fundId))
    .where(
      and(
        sql`${gifts.receivedOn} >= ${range.from}::date`,
        sql`${gifts.receivedOn} <= ${range.to}::date`,
      ),
    )
    .groupBy(funds.id, funds.name, funds.restricted)
    .orderBy(desc(sql`sum(${gifts.amountCents} - ${gifts.refundedCents})`));

  return rows;
}

/**
 * R13.24. Who was giving and has stopped.
 *
 * Gave at least twice in the year before the window and nothing since it
 * began. Twice, because one gift at a wedding collection is not a giver who
 * has lapsed.
 */
export async function lapsedGivers(
  db: Tx,
  who: WriteActor,
  since: string,
): Promise<{ id: string; name: string; lastOn: string; cents: number; gifts: number }[]> {
  if (!canReadGivingAmounts(who)) throw new PermissionError(who.role, "manageGiving");

  const rows = await db
    .select({
      id: members.id,
      first: members.firstName,
      last: members.lastName,
      lastOn: sql<string>`max(${gifts.receivedOn})::text`,
      cents: sql<number>`coalesce(sum(${gifts.amountCents} - ${gifts.refundedCents}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(gifts)
    .innerJoin(members, eq(members.id, gifts.memberId))
    .where(
      and(
        sql`${gifts.receivedOn} < ${since}::date`,
        sql`${gifts.receivedOn} >= (${since}::date - interval '1 year')`,
        sql`not exists (
          select 1 from gifts g2
           where g2.member_id = ${members.id}
             and g2.received_on >= ${since}::date
        )`,
      ),
    )
    .groupBy(members.id, members.firstName, members.lastName)
    .having(sql`count(*) >= 2`)
    .orderBy(desc(sql`sum(${gifts.amountCents} - ${gifts.refundedCents})`))
    .limit(200);

  return rows.map((row) => ({
    id: row.id,
    name: [row.first, row.last].filter(Boolean).join(" "),
    lastOn: row.lastOn,
    cents: row.cents,
    gifts: row.count,
  }));
}

/** R13.25. Whose first gift ever landed inside the window. */
export async function firstTimeGivers(
  db: Tx,
  who: WriteActor,
  range: { from: string; to: string },
): Promise<{ id: string; name: string; firstOn: string; cents: number }[]> {
  if (!canReadGivingAmounts(who)) throw new PermissionError(who.role, "manageGiving");

  const rows = await db
    .select({
      id: members.id,
      first: members.firstName,
      last: members.lastName,
      firstOn: sql<string>`min(${gifts.receivedOn})::text`,
      cents: sql<number>`coalesce(sum(${gifts.amountCents} - ${gifts.refundedCents}), 0)::int`,
    })
    .from(gifts)
    .innerJoin(members, eq(members.id, gifts.memberId))
    .groupBy(members.id, members.firstName, members.lastName)
    .having(
      and(
        sql`min(${gifts.receivedOn}) >= ${range.from}::date`,
        sql`min(${gifts.receivedOn}) <= ${range.to}::date`,
      ),
    )
    .orderBy(desc(sql`min(${gifts.receivedOn})`))
    .limit(200);

  return rows.map((row) => ({
    id: row.id,
    name: [row.first, row.last].filter(Boolean).join(" "),
    firstOn: row.firstOn,
    cents: row.cents,
  }));
}
