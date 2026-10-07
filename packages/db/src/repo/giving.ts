import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { funds, giftBatches, gifts } from "../schema/giving";
import { members } from "../schema/members";
import { PermissionError, canManageGiving, canReadGivingAmounts } from "../roles";
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
  batchId: string | null;
  amountCents: number;
  method: string;
  reference: string | null;
  receivedOn: string;
  note: string | null;
  inKindDescription: string | null;
  feeCents: number;
  refundedCents: number;
}

export interface Batch {
  id: string;
  name: string;
  receivedOn: string;
  expectedCents: number;
  counterOneId: string | null;
  counterTwoId: string | null;
  varianceNote: string | null;
  closed: boolean;
  /** What has actually been entered against it. */
  enteredCents: number;
  lines: number;
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

/** R13.10. Opening a count. */
export async function openBatch(
  db: Tx,
  actor: WriteActor,
  input: {
    name: string;
    receivedOn: string;
    expectedCents: number;
    counterOneId?: string | null;
    counterTwoId?: string | null;
  },
): Promise<{ id: string }> {
  if (!canManageGiving(actor)) throw new PermissionError(actor.role, "manageGiving");
  const name = input.name?.trim();
  if (!name) throw new InvalidInputError("gift.error.batchName");

  const [row] = await db
    .insert(giftBatches)
    .values({
      tenantId: actor.tenantId,
      name: name.slice(0, 80),
      receivedOn: day(input.receivedOn),
      expectedCents: money(input.expectedCents),
      counterOneId: input.counterOneId || null,
      counterTwoId: input.counterTwoId || null,
    })
    .returning({ id: giftBatches.id });

  return { id: row!.id };
}

/** R13.10, R13.11. Changing a count that is still open. */
export async function updateBatch(
  db: Tx,
  actor: WriteActor,
  id: string,
  input: {
    name?: string;
    receivedOn?: string;
    expectedCents?: number;
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
      ...(input.expectedCents === undefined ? {} : { expectedCents: money(input.expectedCents) }),
      ...(input.counterOneId === undefined ? {} : { counterOneId: input.counterOneId || null }),
      ...(input.counterTwoId === undefined ? {} : { counterTwoId: input.counterTwoId || null }),
      updatedAt: new Date(),
    })
    .where(eq(giftBatches.id, id));
}

/** What has been entered against a batch so far. */
async function entered(db: Tx, batchId: string): Promise<{ cents: number; lines: number }> {
  const [row] = await db
    .select({
      cents: sql<number>`coalesce(sum(${gifts.amountCents}), 0)::int`,
      lines: sql<number>`count(*)::int`,
    })
    .from(gifts)
    .where(eq(gifts.batchId, batchId));
  return { cents: row?.cents ?? 0, lines: row?.lines ?? 0 };
}

/**
 * R13.11. Closing a count.
 *
 * Two counters, and either the entered total matches what was declared or
 * somebody says in writing why it does not. A batch that is closed is the
 * record of a deposit, so it stops taking lines.
 */
export async function closeBatch(
  db: Tx,
  actor: WriteActor,
  id: string,
  varianceNote?: string | null,
): Promise<void> {
  if (!canManageGiving(actor)) throw new PermissionError(actor.role, "manageGiving");

  const [batch] = await db
    .select({
      expectedCents: giftBatches.expectedCents,
      counterOneId: giftBatches.counterOneId,
      counterTwoId: giftBatches.counterTwoId,
      closedAt: giftBatches.closedAt,
    })
    .from(giftBatches)
    .where(eq(giftBatches.id, id))
    .limit(1);
  if (!batch) throw new InvalidInputError("gift.error.batchMissing");
  if (batch.closedAt) throw new InvalidInputError("gift.error.batchClosed");
  if (!batch.counterOneId || !batch.counterTwoId) {
    throw new InvalidInputError("gift.error.counters");
  }

  const totals = await entered(db, id);
  const note = varianceNote?.trim() || null;
  if (totals.cents !== batch.expectedCents && !note) {
    throw new InvalidInputError("gift.error.variance");
  }

  await db
    .update(giftBatches)
    .set({ closedAt: new Date(), varianceNote: note, updatedAt: new Date() })
    .where(eq(giftBatches.id, id));
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
      expectedCents: giftBatches.expectedCents,
      counterOneId: giftBatches.counterOneId,
      counterTwoId: giftBatches.counterTwoId,
      varianceNote: giftBatches.varianceNote,
      closedAt: giftBatches.closedAt,
      enteredCents: sql<number>`coalesce(sum(${gifts.amountCents}), 0)::int`,
      lines: sql<number>`count(${gifts.id})::int`,
    })
    .from(giftBatches)
    .leftJoin(gifts, eq(gifts.batchId, giftBatches.id))
    .groupBy(giftBatches.id)
    .orderBy(desc(giftBatches.receivedOn), desc(giftBatches.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    receivedOn: row.receivedOn,
    expectedCents: row.expectedCents,
    counterOneId: row.counterOneId,
    counterTwoId: row.counterTwoId,
    varianceNote: row.varianceNote,
    closed: row.closedAt !== null,
    enteredCents: row.enteredCents,
    lines: row.lines,
  }));
}

export async function getBatch(db: Tx, id: string): Promise<Batch | null> {
  const [found] = (await listBatches(db, 500)).filter((one) => one.id === id);
  return found ?? null;
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
      fundId: gifts.fundId,
      fundName: funds.name,
      batchId: gifts.batchId,
      amountCents: gifts.amountCents,
      method: gifts.method,
      reference: gifts.reference,
      receivedOn: sql<string>`${gifts.receivedOn}::text`,
      note: gifts.note,
      inKindDescription: gifts.inKindDescription,
      feeCents: gifts.feeCents,
      refundedCents: gifts.refundedCents,
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
    memberName: row.memberId ? [row.first, row.last].filter(Boolean).join(" ") : null,
    fundId: row.fundId,
    fundName: row.fundName,
    batchId: row.batchId,
    amountCents: amounts ? row.amountCents : 0,
    method: row.method,
    reference: row.reference,
    receivedOn: row.receivedOn,
    note: row.note,
    inKindDescription: row.inKindDescription,
    feeCents: amounts ? row.feeCents : 0,
    refundedCents: amounts ? row.refundedCents : 0,
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
        sql`${gifts.receivedOn} >= ${range.from}::date`,
        sql`${gifts.receivedOn} <= ${range.to}::date`,
      ),
    );

  return { cents: row?.cents ?? 0, gifts: row?.count ?? 0, givers: row?.givers ?? 0 };
}
