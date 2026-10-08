import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { funds, giftBatches, gifts } from "../schema/giving";
import { members } from "../schema/members";
import { PermissionError, canManageGiving, canReadGivingAmounts } from "../roles";
import { settled } from "./gift-status";
import { InvalidInputError } from "../errors";
import type { WriteActor } from "./members";

/**
 * R13.10 to R13.15. What came in, and the counting session it came in through.
 *
 * Cash and cheques are entered in a batch: the counters declare what they think
 * is in the bag, enter it line by line, and the batch closes only when the two
 * agree or somebody writes down why they do not. That is the whole control, and
 * it is the one the church's auditor asks about.
 */

/** How a gift arrived. */
export const GIFT_METHODS = ["cash", "cheque", "card", "ach", "in_kind", "other"] as const;
export type GiftMethod = (typeof GIFT_METHODS)[number];

export interface Gift {
  id: string;
  memberId: string | null;
  memberName: string | null;
  fundId: string;
  fundName: string;
  /** R13.23. What the church's accounting software calls this fund. */
  fundCode: string | null;
  batchId: string | null;
  amountCents: number;
  method: string;
  reference: string | null;
  receivedOn: string;
  note: string | null;
  inKindDescription: string | null;
  feeCents: number;
  refundedCents: number;
  /** R13.2. settled, pending or failed. */
  status: string;
  /** R13.2. What the bank said, where a bank debit did not arrive. */
  failureReason: string | null;
  /** R13.15. The day the money went back, where any of it did. */
  refundedOn: string | null;
  /** R13.3. Collected by a repeating gift. */
  recurring: boolean;
  /** R13.15. What the money going back is doing: settled, pending or failed. */
  refundStatus: string | null;
}

export interface Batch {
  id: string;
  /** R13.10. The name in its address. */
  slug: string;
  name: string;
  receivedOn: string;
  counterOneId: string | null;
  counterTwoId: string | null;
  closed: boolean;
  /** What was counted. */
  enteredCents: number;
  lines: number;
  /** R13.9. The fund it was given to, or the funds where it was split. */
  funds: string;
  /** R13.12. Cash, cheques, or both. */
  methods: string;
  /** R13.10. The first line's own fund and method, for putting it right. */
  fundId: string | null;
  method: string;
}

const money = (value: unknown): number => {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 100_000_000) {
    throw new InvalidInputError("gift.error.amount");
  }
  return value as number;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

const day = (value: string | undefined | null): string => {
  if (!value || !ISO.test(value)) throw new InvalidInputError("gift.error.date");
  return value;
};

/**
 * R13.10. Opening a counting session, on the first thing counted.
 *
 * A session is named, dated, and carries what was found: the fund it was
 * given to and how much of it there was. More lines go on afterwards, one a
 * fund, which is how a church answers what went to the building.
 */
export async function openBatch(
  db: Tx,
  actor: WriteActor,
  input: {
    name: string;
    receivedOn: string;
    counterOneId?: string | null;
    counterTwoId?: string | null;
  },
): Promise<{ id: string; slug: string }> {
  if (!canManageGiving(actor)) throw new PermissionError(actor.role, "manageGiving");
  const name = input.name?.trim();
  if (!name) throw new InvalidInputError("gift.error.batchName");
  const receivedOn = day(input.receivedOn);

  /*
   * The name in the address, from what the church called it and the day it
   * counted. Two sessions named the same thing on the same day is a church
   * counting twice, so the second takes a number.
   */
  const base = slugOf(`${name.slice(0, 60)}-${receivedOn}`);
  const taken = await db
    .select({ slug: giftBatches.slug })
    .from(giftBatches)
    .where(sql`${giftBatches.slug} = ${base} or ${giftBatches.slug} like ${`${base}-%`}`);
  const used = new Set(taken.map((one) => one.slug));
  let slug = base;
  for (let at = 2; used.has(slug); at += 1) slug = `${base}-${at}`;

  const [row] = await db
    .insert(giftBatches)
    .values({
      tenantId: actor.tenantId,
      slug,
      name: name.slice(0, 80),
      receivedOn,
      counterOneId: input.counterOneId || null,
      counterTwoId: input.counterTwoId || null,
    })
    .returning({ id: giftBatches.id });

  return { id: row!.id, slug };
}

/** A name as it reads in an address. */
function slugOf(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    || "session";
}

/** R13.10, R13.11. Changing a count that is still open. */
export async function updateBatch(
  db: Tx,
  actor: WriteActor,
  id: string,
  input: {
    name?: string;
    receivedOn?: string;
    counterOneId?: string | null;
    counterTwoId?: string | null;
  },
): Promise<void> {
  if (!canManageGiving(actor)) throw new PermissionError(actor.role, "manageGiving");
  const [batch] = await db
    .select({ closedAt: giftBatches.closedAt })
    .from(giftBatches)
    .where(eq(giftBatches.id, id))
    .limit(1);
  if (!batch) throw new InvalidInputError("gift.error.batchMissing");
  if (batch.closedAt) throw new InvalidInputError("gift.error.batchClosed");

  await db
    .update(giftBatches)
    .set({
      ...(input.name === undefined ? {} : { name: input.name.trim().slice(0, 80) }),
      ...(input.receivedOn === undefined ? {} : { receivedOn: day(input.receivedOn) }),
      ...(input.counterOneId === undefined ? {} : { counterOneId: input.counterOneId || null }),
      ...(input.counterTwoId === undefined ? {} : { counterTwoId: input.counterTwoId || null }),
      updatedAt: new Date(),
    })
    .where(eq(giftBatches.id, id));
}

/**
 * R13.11. Finishing a counting session.
 *
 * A session that is finished is the record of a deposit, so it stops taking
 * lines. Reopening is there for the hour afterwards when somebody finds an
 * envelope under the table.
 */
export async function closeBatch(db: Tx, actor: WriteActor, id: string): Promise<void> {
  if (!canManageGiving(actor)) throw new PermissionError(actor.role, "manageGiving");

  const [batch] = await db
    .select({ closedAt: giftBatches.closedAt })
    .from(giftBatches)
    .where(eq(giftBatches.id, id))
    .limit(1);
  if (!batch) throw new InvalidInputError("gift.error.batchMissing");
  if (batch.closedAt) throw new InvalidInputError("gift.error.batchClosed");

  await db
    .update(giftBatches)
    .set({ closedAt: new Date(), updatedAt: new Date() })
    .where(eq(giftBatches.id, id));
}

/**
 * R13.10. Putting right a counting session that was entered wrong.
 *
 * A session is the day, its name, and the one thing that was counted, so
 * changing it changes both: the batch keeps the name and the date, and its
 * line keeps the fund, the method and the amount. A session with several
 * lines has the first of them changed, because that is the one the panel
 * was showing.
 */
export async function amendBatch(
  db: Tx,
  actor: WriteActor,
  id: string,
  input: {
    name: string;
    receivedOn: string;
    fundId: string;
    amountCents: number;
    method: GiftMethod;
  },
): Promise<void> {
  if (!canManageGiving(actor)) throw new PermissionError(actor.role, "recordGift");
  if (!GIFT_METHODS.includes(input.method)) throw new InvalidInputError("gift.error.method");

  const amount = money(input.amountCents);
  if (amount <= 0) throw new InvalidInputError("gift.error.amount");

  const [fund] = await db
    .select({ id: funds.id })
    .from(funds)
    .where(and(eq(funds.id, input.fundId), isNull(funds.archivedAt)))
    .limit(1);
  if (!fund) throw new InvalidInputError("gift.error.fund");

  await updateBatch(db, actor, id, { name: input.name, receivedOn: input.receivedOn });

  const [line] = await db
    .select({ id: gifts.id })
    .from(gifts)
    .where(eq(gifts.batchId, id))
    .orderBy(asc(gifts.createdAt))
    .limit(1);

  if (!line) {
    await recordGift(db, actor, {
      fundId: input.fundId,
      batchId: id,
      amountCents: amount,
      method: input.method,
      receivedOn: input.receivedOn,
    });
    return;
  }

  await db
    .update(gifts)
    .set({
      fundId: input.fundId,
      amountCents: amount,
      method: input.method,
      receivedOn: day(input.receivedOn),
      updatedAt: new Date(),
    })
    .where(eq(gifts.id, line.id));
}

/**
 * R13.10. Taking a counting session off the record.
 *
 * Somebody counted twice, or named the wrong day. What it held goes with
 * it, because a line of a session that never happened is money the church
 * did not receive.
 */
export async function removeBatch(db: Tx, actor: WriteActor, id: string): Promise<void> {
  if (!canManageGiving(actor)) throw new PermissionError(actor.role, "manageGiving");

  await db.delete(gifts).where(eq(gifts.batchId, id));
  const gone = await db
    .delete(giftBatches)
    .where(eq(giftBatches.id, id))
    .returning({ id: giftBatches.id });
  if (gone.length === 0) throw new InvalidInputError("gift.error.batchMissing");
}

/** R13.10. Reopening a count, while the deposit is still being put right. */
export async function reopenBatch(db: Tx, actor: WriteActor, id: string): Promise<void> {
  if (!canManageGiving(actor)) throw new PermissionError(actor.role, "manageGiving");
  const changed = await db
    .update(giftBatches)
    .set({ closedAt: null, updatedAt: new Date() })
    .where(eq(giftBatches.id, id))
    .returning({ id: giftBatches.id });
  if (changed.length === 0) throw new InvalidInputError("gift.error.batchMissing");
}

/** R13.10. The counts this church has run, newest first. */
export async function listBatches(db: Tx, limit = 30): Promise<Batch[]> {
  const rows = await db
    .select({
      id: giftBatches.id,
      name: giftBatches.name,
      receivedOn: sql<string>`${giftBatches.receivedOn}::text`,
      slug: giftBatches.slug,
      counterOneId: giftBatches.counterOneId,
      counterTwoId: giftBatches.counterTwoId,
      closedAt: giftBatches.closedAt,
      enteredCents: sql<number>`coalesce(sum(${gifts.amountCents}), 0)::int`,
      lines: sql<number>`count(${gifts.id})::int`,
      funds: sql<string>`coalesce(string_agg(distinct ${funds.name}, ', '), '')`,
      methods: sql<string>`coalesce(string_agg(distinct ${gifts.method}, ','), '')`,
      fundId: sql<string | null>`(array_agg(${gifts.fundId} order by ${gifts.createdAt}))[1]`,
      method: sql<string | null>`(array_agg(${gifts.method} order by ${gifts.createdAt}))[1]`,
    })
    .from(giftBatches)
    .leftJoin(gifts, eq(gifts.batchId, giftBatches.id))
    .leftJoin(funds, eq(funds.id, gifts.fundId))
    .groupBy(giftBatches.id)
    .orderBy(desc(giftBatches.receivedOn), desc(giftBatches.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    receivedOn: row.receivedOn,
    slug: row.slug ?? row.id,
    counterOneId: row.counterOneId,
    counterTwoId: row.counterTwoId,
    closed: row.closedAt !== null,
    enteredCents: row.enteredCents,
    lines: row.lines,
    funds: row.funds,
    methods: row.methods,
    fundId: row.fundId,
    method: row.method ?? "cash",
  }));
}

/** R13.10. One session, by the name in its address or by its id. */
export async function getBatch(db: Tx, id: string): Promise<Batch | null> {
  const all = await listBatches(db, 500);
  return all.find((one) => one.slug === id || one.id === id) ?? null;
}

export interface GiftInput {
  memberId?: string | null;
  fundId: string;
  batchId?: string | null;
  amountCents: number;
  method: GiftMethod;
  reference?: string | null;
  receivedOn: string;
  note?: string | null;
  inKindDescription?: string | null;
}

/** R13.12 to R13.14. A line: who gave, to what, how much, how. */
export async function recordGift(
  db: Tx,
  actor: WriteActor,
  input: GiftInput,
): Promise<{ id: string }> {
  if (!canManageGiving(actor)) throw new PermissionError(actor.role, "recordGift");

  if (!GIFT_METHODS.includes(input.method)) throw new InvalidInputError("gift.error.method");
  const inKind = input.method === "in_kind";
  const amount = inKind ? 0 : money(input.amountCents);
  if (!inKind && amount <= 0) throw new InvalidInputError("gift.error.amount");
  if (inKind && !input.inKindDescription?.trim()) throw new InvalidInputError("gift.error.inKind");

  const [fund] = await db
    .select({ id: funds.id })
    .from(funds)
    .where(and(eq(funds.id, input.fundId), isNull(funds.archivedAt)))
    .limit(1);
  if (!fund) throw new InvalidInputError("gift.error.fund");

  if (input.batchId) {
    const [batch] = await db
      .select({ closedAt: giftBatches.closedAt })
      .from(giftBatches)
      .where(eq(giftBatches.id, input.batchId))
      .limit(1);
    if (!batch) throw new InvalidInputError("gift.error.batchMissing");
    if (batch.closedAt) throw new InvalidInputError("gift.error.batchClosed");
  }

  const [row] = await db
    .insert(gifts)
    .values({
      tenantId: actor.tenantId,
      memberId: input.memberId || null,
      fundId: input.fundId,
      batchId: input.batchId || null,
      amountCents: amount,
      method: input.method,
      reference: input.reference?.trim() || null,
      receivedOn: day(input.receivedOn),
      note: input.note?.trim() || null,
      inKindDescription: input.inKindDescription?.trim() || null,
    })
    .returning({ id: gifts.id });

  return { id: row!.id };
}

/** R13.15. Taking a line back off a count that is still open. */
export async function removeGift(db: Tx, actor: WriteActor, id: string): Promise<void> {
  if (!canManageGiving(actor)) throw new PermissionError(actor.role, "recordGift");

  const [gift] = await db
    .select({ batchId: gifts.batchId, intent: gifts.stripePaymentIntentId })
    .from(gifts)
    .where(eq(gifts.id, id))
    .limit(1);
  if (!gift) throw new InvalidInputError("gift.error.missing");
  // A gift that came through Stripe is a record of a payment that happened, so
  // it is refunded rather than removed.
  if (gift.intent) throw new InvalidInputError("gift.error.online");

  if (gift.batchId) {
    const [batch] = await db
      .select({ closedAt: giftBatches.closedAt })
      .from(giftBatches)
      .where(eq(giftBatches.id, gift.batchId))
      .limit(1);
    if (batch?.closedAt) throw new InvalidInputError("gift.error.batchClosed");
  }

  await db.delete(gifts).where(eq(gifts.id, id));
}

/**
 * R13.x. The gifts, newest first.
 *
 * R1.5. Amounts are a field-level permission, so somebody without it gets the
 * records with the amount zeroed rather than a different query somewhere else
 * deciding to hide a column.
 */
export async function listGifts(
  db: Tx,
  who: WriteActor,
  filter: { batchId?: string; memberId?: string; from?: string; to?: string; limit?: number } = {},
): Promise<Gift[]> {
  const where = [
    filter.batchId ? eq(gifts.batchId, filter.batchId) : undefined,
    filter.memberId ? eq(gifts.memberId, filter.memberId) : undefined,
    filter.from ? sql`${gifts.receivedOn} >= ${filter.from}::date` : undefined,
    filter.to ? sql`${gifts.receivedOn} <= ${filter.to}::date` : undefined,
  ].filter(Boolean);

  const rows = await db
    .select({
      id: gifts.id,
      memberId: gifts.memberId,
      first: members.firstName,
      last: members.lastName,
      giverName: gifts.giverName,
      fundId: gifts.fundId,
      fundName: funds.name,
      fundCode: funds.code,
      batchId: gifts.batchId,
      amountCents: gifts.amountCents,
      method: gifts.method,
      reference: gifts.reference,
      receivedOn: sql<string>`${gifts.receivedOn}::text`,
      note: gifts.note,
      inKindDescription: gifts.inKindDescription,
      feeCents: gifts.feeCents,
      refundedCents: gifts.refundedCents,
      status: gifts.status,
      failureReason: gifts.failureReason,
      refundedAt: sql<string | null>`${gifts.refundedAt}::text`,
      recurring: gifts.recurring,
      refundStatus: gifts.refundStatus,
    })
    .from(gifts)
    .innerJoin(funds, eq(funds.id, gifts.fundId))
    .leftJoin(members, eq(members.id, gifts.memberId))
    .where(where.length > 0 ? and(...where) : undefined)
    .orderBy(desc(gifts.receivedOn), desc(gifts.createdAt))
    .limit(filter.limit ?? 200);

  const amounts = canReadGivingAmounts(who);

  return rows.map((row) => ({
    id: row.id,
    memberId: row.memberId,
    /*
     * R13.6. The name on the gift: the person's where the church holds one,
     * and otherwise what the giver typed on the giving page. Null is a gift
     * nobody put a name to, which is what anonymous means.
     */
    memberName: row.memberId
      ? [row.first, row.last].filter(Boolean).join(" ")
      : row.giverName,
    fundId: row.fundId,
    fundName: row.fundName,
    fundCode: row.fundCode,
    batchId: row.batchId,
    amountCents: amounts ? row.amountCents : 0,
    method: row.method,
    reference: row.reference,
    receivedOn: row.receivedOn,
    note: row.note,
    inKindDescription: row.inKindDescription,
    feeCents: amounts ? row.feeCents : 0,
    refundedCents: amounts ? row.refundedCents : 0,
    status: row.status,
    failureReason: row.failureReason,
    refundedOn: row.refundedAt ? row.refundedAt.slice(0, 10) : null,
    recurring: row.recurring,
    refundStatus: row.refundStatus,
  }));
}

/** R13.21. What came in over a period, and from how many people. */
export async function givingTotals(
  db: Tx,
  range: { from: string; to: string },
): Promise<{ cents: number; gifts: number; givers: number }> {
  const [row] = await db
    .select({
      cents: sql<number>`coalesce(sum(${gifts.amountCents} - ${gifts.refundedCents}), 0)::int`,
      count: sql<number>`count(*)::int`,
      givers: sql<number>`count(distinct ${gifts.memberId})::int`,
    })
    .from(gifts)
    .where(
      and(
        settled,
        sql`${gifts.receivedOn} >= ${range.from}::date`,
        sql`${gifts.receivedOn} <= ${range.to}::date`,
      ),
    );

  return { cents: row?.cents ?? 0, gifts: row?.count ?? 0, givers: row?.givers ?? 0 };
}

/**
 * R13.2. What has been authorised and has not arrived yet.
 *
 * Bank transfers only, in practice: a card either works or it does not. It is
 * read without a date range, because the question is never "how much was on
 * its way in March", it is "what is still coming".
 */
export async function onTheWay(
  db: Tx,
  memberId?: string,
): Promise<{ cents: number; gifts: number }> {
  const [row] = await db
    .select({
      cents: sql<number>`coalesce(sum(${gifts.amountCents}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(gifts)
    .where(
      and(
        sql`${gifts.status} = 'pending'`,
        memberId ? eq(gifts.memberId, memberId) : undefined,
      ),
    );

  return { cents: row?.cents ?? 0, gifts: row?.count ?? 0 };
}

/**
 * R13.18. What one person has given over a period.
 *
 * Read on their own record, where a pastor with the permission asks "are they
 * giving" and a treasurer asks "what goes on their statement". The household
 * roll-up that makes a couple one statement is R13.18 proper and comes with
 * the statements.
 */
export async function givingForPerson(
  db: Tx,
  memberId: string,
  range: { from: string; to: string },
): Promise<{ cents: number; gifts: number; lastOn: string | null }> {
  const [row] = await db
    .select({
      cents: sql<number>`coalesce(sum(${gifts.amountCents} - ${gifts.refundedCents}), 0)::int`,
      count: sql<number>`count(*)::int`,
      lastOn: sql<string | null>`max(${gifts.receivedOn})::text`,
    })
    .from(gifts)
    .where(
      and(
        settled,
        eq(gifts.memberId, memberId),
        sql`${gifts.receivedOn} >= ${range.from}::date`,
        sql`${gifts.receivedOn} <= ${range.to}::date`,
      ),
    );

  return { cents: row?.cents ?? 0, gifts: row?.count ?? 0, lastOn: row?.lastOn ?? null };
}

/**
 * R13.15. A gift given back.
 *
 * Recorded against the gift rather than deleted, because it happened: the
 * total comes down, the statement comes down with it, and the audit log keeps
 * both. A gift taken by card is refunded through Stripe first and written down
 * here afterwards, so the two can never disagree.
 */
export async function refundGift(
  db: Tx,
  actor: WriteActor,
  id: string,
  cents: number,
  /** R13.15. What Stripe is doing with it, and the refund it is doing it to. */
  how: { status?: "settled" | "pending" | "failed"; refundId?: string | null } = {},
): Promise<void> {
  if (!canManageGiving(actor)) throw new PermissionError(actor.role, "recordGift");

  const [gift] = await db
    .select({ amountCents: gifts.amountCents, refundedCents: gifts.refundedCents })
    .from(gifts)
    .where(eq(gifts.id, id))
    .limit(1);
  if (!gift) throw new InvalidInputError("gift.error.missing");

  const amount = money(cents);
  if (amount <= 0 || amount + gift.refundedCents > gift.amountCents) {
    throw new InvalidInputError("gift.error.refund");
  }

  await db
    .update(gifts)
    .set({
      refundedCents: gift.refundedCents + amount,
      refundedAt: new Date(),
      refundStatus: how.status ?? "settled",
      ...(how.refundId ? { stripeRefundId: how.refundId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(gifts.id, id));
}

/** What Stripe needs to give a card gift back: the charge it was taken on. */
export async function giftCharge(
  db: Tx,
  id: string,
): Promise<{ chargeId: string | null; amountCents: number; refundedCents: number } | null> {
  const [row] = await db
    .select({
      chargeId: gifts.stripeChargeId,
      amountCents: gifts.amountCents,
      refundedCents: gifts.refundedCents,
    })
    .from(gifts)
    .where(eq(gifts.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * R13.18. Putting a gift against the person who gave it.
 *
 * An online gift from an address the church has never seen arrives with a
 * name and nobody attached. It still counts to the fund, but it is on no
 * record and on no statement, which is noticed in January. This is how a
 * treasurer says who it was, and `null` takes it back off a record.
 */
export async function attachGift(
  db: Tx,
  actor: WriteActor,
  id: string,
  memberId: string | null,
): Promise<void> {
  if (!canManageGiving(actor)) throw new PermissionError(actor.role, "recordGift");

  const changed = await db
    .update(gifts)
    .set({ memberId, updatedAt: new Date() })
    .where(eq(gifts.id, id))
    .returning({ id: gifts.id });
  if (changed.length === 0) throw new InvalidInputError("gift.error.missing");
}
