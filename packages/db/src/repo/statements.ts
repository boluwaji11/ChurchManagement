import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { funds, gifts } from "../schema/giving";
import { members, households, householdMemberships, addresses } from "../schema/members";
import { PermissionError, canReadGivingAmounts, canManageGiving } from "../roles";
import { settled } from "./gift-status";
import { tenants } from "../schema/tenancy";
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
  /** The person, or whoever in the household the statement was asked for. */
  memberId: string;
  name: string;
  /**
   * R13.17. Where to post it, in the parts an envelope needs.
   *
   * A statement is a letter a church prints and puts in the post, so the
   * sheet carries the address it is going to. Their own where they have
   * one, otherwise the household's.
   */
  address: {
    line1: string;
    line2: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    country: string;
  } | null;
  lines: StatementLine[];
  /** Cash gifts only. A gift in kind is listed and left out of the total. */
  totalCents: number;
  /** R13.17. Whether any single gift needs the written acknowledgment. */
  needsAcknowledgment: boolean;
}

/**
 * R13.18, R13.19. Who has anything to receive a statement for, this year.
 *
 * By person, or by household where the church has chosen that: a couple who
 * gave on one card get one statement between them, and anybody with no
 * household stands on their own either way.
 */
export async function statementGivers(
  db: Tx,
  who: WriteActor,
  year: string,
  by: "person" | "household" = "person",
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
        settled,
        sql`${gifts.receivedOn} >= ${`${year}-01-01`}::date`,
        sql`${gifts.receivedOn} <= ${`${year}-12-31`}::date`,
      ),
    )
    .groupBy(gifts.memberId, members.firstName, members.lastName)
    .orderBy(asc(members.lastName), asc(members.firstName));

  const people = rows
    .filter((row) => row.memberId !== null)
    .map((row) => ({
      memberId: row.memberId!,
      name: [row.first, row.last].filter(Boolean).join(" "),
      totalCents: row.totalCents,
      gifts: row.count,
    }));

  if (by === "person") return people;

  /*
   * R13.18. Folded into households, with the household's own name on the
   * statement and the first of its givers standing for it.
   */
  const homes = await db
    .select({
      memberId: householdMemberships.memberId,
      householdId: householdMemberships.householdId,
      name: households.name,
    })
    .from(householdMemberships)
    .innerJoin(households, eq(households.id, householdMemberships.householdId));

  const byMember = new Map(homes.map((row) => [row.memberId, row]));
  const folded = new Map<string, { memberId: string; name: string; totalCents: number; gifts: number }>();

  for (const one of people) {
    const home = byMember.get(one.memberId);
    const key = home?.householdId ?? one.memberId;
    const held = folded.get(key);
    if (held) {
      held.totalCents += one.totalCents;
      held.gifts += one.gifts;
      continue;
    }
    folded.set(key, {
      memberId: one.memberId,
      name: home?.name ?? one.name,
      totalCents: one.totalCents,
      gifts: one.gifts,
    });
  }

  return [...folded.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * R13.17, R13.18. One statement for one year.
 *
 * Written for a person, or for the household they belong to where the church
 * has chosen that, in which case every gift from anybody in it is on the one
 * sheet under the household's own name.
 */
export async function statementFor(
  db: Tx,
  who: WriteActor,
  memberId: string,
  year: string,
  by: "person" | "household" = "person",
): Promise<Statement | null> {
  if (!canReadGivingAmounts(who)) throw new PermissionError(who.role, "manageGiving");

  const [person] = await db
    .select({ id: members.id, first: members.firstName, last: members.lastName })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);
  if (!person) return null;

  /* R13.18. Whose gifts go on this sheet, and whose name is at the top. */
  let whose: string[] = [person.id];
  let name = [person.first, person.last].filter(Boolean).join(" ");

  if (by === "household") {
    const [home] = await db
      .select({ id: households.id, name: households.name })
      .from(householdMemberships)
      .innerJoin(households, eq(households.id, householdMemberships.householdId))
      .where(eq(householdMemberships.memberId, person.id))
      .limit(1);

    if (home) {
      name = home.name;
      const kin = await db
        .select({ memberId: householdMemberships.memberId })
        .from(householdMemberships)
        .where(eq(householdMemberships.householdId, home.id));
      whose = kin.map((one) => one.memberId);
    }
  }

  /*
   * R13.17. Where the letter goes. Their own address first, the household's
   * where they have none of their own, and the primary one of either.
   */
  const [where] = await db
    .select({
      line1: addresses.line1,
      line2: addresses.line2,
      city: addresses.city,
      region: addresses.region,
      postalCode: addresses.postalCode,
      country: addresses.country,
    })
    .from(addresses)
    .where(
      or(
        inArray(addresses.memberId, whose),
        sql`${addresses.householdId} in (
          select household_id from household_memberships where member_id = ${person.id}
        )`,
      ),
    )
    .orderBy(desc(addresses.isPrimary), sql`${addresses.memberId} = ${person.id} desc`)
    .limit(1);

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
        settled,
        inArray(gifts.memberId, whose),
        sql`${gifts.receivedOn} >= ${`${year}-01-01`}::date`,
        sql`${gifts.receivedOn} <= ${`${year}-12-31`}::date`,
      ),
    )
    .orderBy(asc(gifts.receivedOn));

  return {
    memberId: person.id,
    name,
    address: where ?? null,
    lines: rows,
    totalCents: rows.reduce((sum, row) => sum + (row.inKindDescription ? 0 : row.amountCents), 0),
    needsAcknowledgment: rows.some((row) => row.amountCents >= ACKNOWLEDGE_FROM_CENTS),
  };
}


/**
 * R13.18. The church's choice: one statement a person, or one a household.
 *
 * Its own writer rather than a field on the church form, because it is a
 * decision the treasurer makes in January and the church profile is a screen
 * the office secretary keeps.
 */
export async function setStatementsBy(
  db: Tx,
  actor: WriteActor,
  by: "person" | "household",
): Promise<void> {
  if (!canManageGiving(actor)) throw new PermissionError(actor.role, "manageGiving");
  await db
    .update(tenants)
    .set({ statementsBy: by === "household" ? "household" : "person" })
    .where(eq(tenants.id, actor.tenantId));
}
