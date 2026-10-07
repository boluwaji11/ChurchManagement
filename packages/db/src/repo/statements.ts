import { and, asc, eq, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { funds, gifts } from "../schema/giving";
import { members } from "../schema/members";
import { PermissionError, canReadGivingAmounts } from "../roles";
import type { WriteActor } from "./members";

/**
 * R13.17 to R13.19. The year-end giving statement.
 *
 * This is the one piece of the product with a legal shape and a hard deadline.
 * IRS Publication 1771 asks for the church's name, the date and amount of each
 * gift, a description of a non-cash gift with no valuation on it (the giver
 * values their own gift), and a statement about goods and services. Any single
 * gift of $250 or more needs a contemporaneous written acknowledgment, which
 * is what this is.
 *
 * Nothing here sends anything. The statement is read on screen, printed, and
 * downloaded by the giver from their own portal.
 */

/** R13.17. The threshold at which a single gift must be acknowledged in writing. */
export const ACKNOWLEDGE_FROM_CENTS = 25_000;

export interface StatementLine {
  date: string;
  fund: string;
  amountCents: number;
  method: string;
  /** R13.17. A non-cash gift is described and never valued by the church. */
  inKindDescription: string | null;
}

export interface Statement {
  memberId: string;
  name: string;
  lines: StatementLine[];
  /** Cash gifts only. A gift in kind is listed and left out of the total. */
  totalCents: number;
  /** R13.17. Whether any single gift needs the written acknowledgment. */
  needsAcknowledgment: boolean;
}

/** R13.19. Who has anything to receive a statement for, this year. */
export async function statementGivers(
  db: Tx,
  who: WriteActor,
  year: string,
): Promise<{ memberId: string; name: string; totalCents: number; gifts: number }[]> {
  if (!canReadGivingAmounts(who)) throw new PermissionError(who.role, "manageGiving");

  const rows = await db
    .select({
      memberId: gifts.memberId,
      first: members.firstName,
      last: members.lastName,
      totalCents: sql<number>`coalesce(sum(${gifts.amountCents} - ${gifts.refundedCents}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(gifts)
    .innerJoin(members, eq(members.id, gifts.memberId))
    .where(
      and(
        sql`${gifts.receivedOn} >= ${`${year}-01-01`}::date`,
        sql`${gifts.receivedOn} <= ${`${year}-12-31`}::date`,
      ),
    )
    .groupBy(gifts.memberId, members.firstName, members.lastName)
    .orderBy(asc(members.lastName), asc(members.firstName));

  return rows
    .filter((row) => row.memberId !== null)
    .map((row) => ({
      memberId: row.memberId!,
      name: [row.first, row.last].filter(Boolean).join(" "),
      totalCents: row.totalCents,
      gifts: row.count,
    }));
}

/** R13.17. One person's statement for one year. */
export async function statementFor(
  db: Tx,
  who: WriteActor,
  memberId: string,
  year: string,
): Promise<Statement | null> {
  if (!canReadGivingAmounts(who)) throw new PermissionError(who.role, "manageGiving");

  const [person] = await db
    .select({ id: members.id, first: members.firstName, last: members.lastName })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);
  if (!person) return null;

  const rows = await db
    .select({
      date: sql<string>`${gifts.receivedOn}::text`,
      fund: funds.name,
      amountCents: sql<number>`(${gifts.amountCents} - ${gifts.refundedCents})::int`,
      method: gifts.method,
      inKindDescription: gifts.inKindDescription,
    })
    .from(gifts)
    .innerJoin(funds, eq(funds.id, gifts.fundId))
    .where(
      and(
        eq(gifts.memberId, memberId),
        sql`${gifts.receivedOn} >= ${`${year}-01-01`}::date`,
        sql`${gifts.receivedOn} <= ${`${year}-12-31`}::date`,
      ),
    )
    .orderBy(asc(gifts.receivedOn));

  return {
    memberId: person.id,
    name: [person.first, person.last].filter(Boolean).join(" "),
    lines: rows,
    totalCents: rows.reduce((sum, row) => sum + (row.inKindDescription ? 0 : row.amountCents), 0),
    needsAcknowledgment: rows.some((row) => row.amountCents >= ACKNOWLEDGE_FROM_CENTS),
  };
}
