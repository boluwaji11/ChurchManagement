import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { funds, gifts } from "../schema/giving";
import { members, households, householdMemberships, addresses } from "../schema/members";
import { PermissionError, canReadGivingAmounts, canManageGiving } from "../roles";
import { settled } from "./gift-status";
import { tenants } from "../schema/tenancy";
import type { WriteActor } from "./members";
import { t } from "@connectapp/i18n";

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

/**
 * R13.18. Every year this church has taken a gift in, newest first.
 *
 * The picker is built from this rather than from a fixed count back, so a
 * church in its ninth year can reach its first and a church in its first is
 * not offered two years of blank pages.
 */
export async function givingYears(db: Tx, memberId?: string): Promise<string[]> {
  const rows = await db
    .select({ year: sql<string>`to_char(${gifts.receivedOn}, 'YYYY')` })
    .from(gifts)
    .where(memberId ? and(settled, eq(gifts.memberId, memberId)) : settled)
    .groupBy(sql`to_char(${gifts.receivedOn}, 'YYYY')`)
    .orderBy(desc(sql`to_char(${gifts.receivedOn}, 'YYYY')`));
  return rows.map((row) => row.year);
}

/**
 * R13.18. A household's name, as it reads at the head of a statement.
 *
 * "Smith" on its own is a surname, and a letter addressed to it reads as a
 * letter to one person. A church that has already written the word into the
 * name keeps what it wrote.
 */
function householdName(name: string): string {
  const written = t("statement.household", { name });
  return /household\s*$/i.test(name.trim()) ? name : written;
}

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
      name: home ? householdName(home.name) : one.name,
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
  const [one] = await statementsFor(db, who, [memberId], year, by);
  return one ?? null;
}

/**
 * R13.17, R13.18. Every statement a church is printing, read together.
 *
 * Five queries, whatever the number of givers. One a time cost three round
 * trips a person, or five where the church statements by household, so four
 * hundred givers was two thousand of them in a row and the sheet never
 * reached the printer: it ran past the function's limit first.
 *
 * The order given is the order returned, and a giver this church has no record
 * of is left out rather than returned empty.
 */
export async function statementsFor(
  db: Tx,
  who: WriteActor,
  memberIds: readonly string[],
  year: string,
  by: "person" | "household" = "person",
): Promise<Statement[]> {
  if (!canReadGivingAmounts(who)) throw new PermissionError(who.role, "manageGiving");
  if (memberIds.length === 0) return [];

  const wanted = [...new Set(memberIds)];

  const people = await db
    .select({ id: members.id, first: members.firstName, last: members.lastName })
    .from(members)
    .where(inArray(members.id, wanted));

  const person = new Map(people.map((row) => [row.id, row]));

  /* R13.18. Whose gifts go on each sheet, and whose name is at the top. */
  const whose = new Map<string, string[]>();
  const naming = new Map<string, string>();
  const homeOf = new Map<string, string>();

  for (const row of people) {
    whose.set(row.id, [row.id]);
    naming.set(row.id, [row.first, row.last].filter(Boolean).join(" "));
  }

  if (by === "household") {
    const homes = await db
      .select({
        memberId: householdMemberships.memberId,
        householdId: householdMemberships.householdId,
        name: households.name,
      })
      .from(householdMemberships)
      .innerJoin(households, eq(households.id, householdMemberships.householdId))
      .where(inArray(householdMemberships.memberId, wanted));

    /* A member listed in two households keeps the first, which is what the
       one-at-a-time version's unordered `limit 1` did. */
    for (const home of homes) {
      if (homeOf.has(home.memberId)) continue;
      homeOf.set(home.memberId, home.householdId);
      naming.set(home.memberId, householdName(home.name));
    }

    const householdIds = [...new Set(homeOf.values())];
    if (householdIds.length > 0) {
      const kin = await db
        .select({
          memberId: householdMemberships.memberId,
          householdId: householdMemberships.householdId,
        })
        .from(householdMemberships)
        .where(inArray(householdMemberships.householdId, householdIds));

      const byHousehold = new Map<string, string[]>();
      for (const row of kin) {
        const held = byHousehold.get(row.householdId);
        if (held) held.push(row.memberId);
        else byHousehold.set(row.householdId, [row.memberId]);
      }

      for (const [memberId, householdId] of homeOf) {
        const found = byHousehold.get(householdId);
        if (found) whose.set(memberId, found);
      }
    }
  }

  const everyone = [...new Set([...whose.values()].flat())];

  /*
   * R13.17. Where each letter goes. Their own address first, the household's
   * where they have none of their own, and the primary one of either. Read for
   * everybody at once and then chosen per sheet, because the choice depends on
   * which person the sheet is for.
   */
  const homeIds = [...new Set(homeOf.values())];
  const reach = await db
    .select({
      memberId: addresses.memberId,
      householdId: addresses.householdId,
      isPrimary: addresses.isPrimary,
      line1: addresses.line1,
      line2: addresses.line2,
      city: addresses.city,
      region: addresses.region,
      postalCode: addresses.postalCode,
      country: addresses.country,
    })
    .from(addresses)
    .where(
      homeIds.length > 0
        ? or(inArray(addresses.memberId, everyone), inArray(addresses.householdId, homeIds))
        : inArray(addresses.memberId, everyone),
    );

  const rows = await db
    .select({
      memberId: gifts.memberId,
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
        inArray(gifts.memberId, everyone),
        sql`${gifts.receivedOn} >= ${`${year}-01-01`}::date`,
        sql`${gifts.receivedOn} <= ${`${year}-12-31`}::date`,
      ),
    )
    .orderBy(asc(gifts.receivedOn));

  const giftsBy = new Map<string, StatementLine[]>();
  for (const row of rows) {
    if (!row.memberId) continue;
    const line: StatementLine = {
      date: row.date,
      fund: row.fund,
      amountCents: row.amountCents,
      method: row.method,
      inKindDescription: row.inKindDescription,
    };
    const held = giftsBy.get(row.memberId);
    if (held) held.push(line);
    else giftsBy.set(row.memberId, [line]);
  }

  const out: Statement[] = [];

  for (const memberId of memberIds) {
    const found = person.get(memberId);
    if (!found) continue;

    const mine = whose.get(memberId) ?? [memberId];
    const household = homeOf.get(memberId);

    /* The same precedence the one-at-a-time version ordered by: a primary
       address first, then one of this person's own rather than their kin's. */
    const candidates = reach
      .filter(
        (row) =>
          (row.memberId && mine.includes(row.memberId)) ||
          (household && row.householdId === household),
      )
      .sort(
        (a, b) =>
          Number(b.isPrimary) - Number(a.isPrimary) ||
          Number(b.memberId === memberId) - Number(a.memberId === memberId),
      );

    const where = candidates[0];

    const lines = mine
      .flatMap((id) => giftsBy.get(id) ?? [])
      .sort((a, b) => a.date.localeCompare(b.date));

    out.push({
      memberId: found.id,
      name: naming.get(memberId) ?? "",
      address: where
        ? {
            line1: where.line1,
            line2: where.line2,
            city: where.city,
            region: where.region,
            postalCode: where.postalCode,
            country: where.country,
          }
        : null,
      lines,
      totalCents: lines.reduce((sum, row) => sum + (row.inKindDescription ? 0 : row.amountCents), 0),
      needsAcknowledgment: lines.some((row) => row.amountCents >= ACKNOWLEDGE_FROM_CENTS),
    });
  }

  return out;
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
