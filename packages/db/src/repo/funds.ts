import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { funds, gifts } from "../schema/giving";
import { settled } from "./gift-status";
import { PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import { canManageGiving } from "../roles";
import type { WriteActor } from "./members";

/**
 * R13.9. What a gift can be given to.
 *
 * A church runs a general fund and a handful of others, and the one thing the
 * product must get right is which of them are restricted: money given for a
 * building is reported apart from the rest, because it cannot be spent on the
 * electricity bill.
 */

export interface Fund {
  id: string;
  name: string;
  code: string | null;
  restricted: boolean;
  description: string | null;
  archived: boolean;
}

const NAME_LIMIT = 80;
const CODE_LIMIT = 16;

function checkName(name: string | undefined | null): string {
  const trimmed = name?.trim();
  if (!trimmed) throw new InvalidInputError("fund.error.name");
  return trimmed.slice(0, NAME_LIMIT);
}

/** R13.9. The funds this church keeps. */
export async function listFunds(
  db: Tx,
  options: { includeArchived?: boolean } = {},
): Promise<Fund[]> {
  const rows = await db
    .select({
      id: funds.id,
      name: funds.name,
      code: funds.code,
      restricted: funds.restricted,
      description: funds.description,
      archivedAt: funds.archivedAt,
    })
    .from(funds)
    .where(options.includeArchived ? undefined : isNull(funds.archivedAt))
    .orderBy(asc(funds.position), asc(funds.name));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    restricted: row.restricted,
    description: row.description,
    archived: row.archivedAt !== null,
  }));
}

export interface FundInput {
  name: string;
  code?: string | null;
  restricted?: boolean;
  description?: string | null;
}

/** R13.9. Writing a fund down, or changing one. */
export async function writeFund(
  db: Tx,
  actor: WriteActor,
  input: FundInput & { id?: string },
): Promise<{ id: string }> {
  if (!canManageGiving(actor)) throw new PermissionError(actor.role, "manageGiving");
  const name = checkName(input.name);
  const code = input.code?.trim().toUpperCase().slice(0, CODE_LIMIT) || null;

  const [clash] = await db
    .select({ id: funds.id })
    .from(funds)
    .where(input.id ? and(eq(funds.name, name), ne(funds.id, input.id)) : eq(funds.name, name))
    .limit(1);
  if (clash) throw new InvalidInputError("fund.error.taken");

  const values = {
    name,
    code,
    restricted: input.restricted ?? false,
    description: input.description?.trim() || null,
  };

  if (input.id) {
    const changed = await db
      .update(funds)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(funds.id, input.id))
      .returning({ id: funds.id });
    if (changed.length === 0) throw new InvalidInputError("fund.error.missing");
    return { id: input.id };
  }

  const [last] = await db
    .select({ at: sql<number>`coalesce(max(${funds.position}), -1)::int` })
    .from(funds);

  const [row] = await db
    .insert(funds)
    .values({ tenantId: actor.tenantId, ...values, position: (last?.at ?? -1) + 1 })
    .returning({ id: funds.id });

  return { id: row!.id };
}

/**
 * R13.9. Takes a fund off the list a gift can be given to, or puts it back.
 *
 * Never deleted: every gift already given to it still has to read and still has
 * to appear on a statement.
 */
export async function setFundArchived(
  db: Tx,
  actor: WriteActor,
  id: string,
  archived: boolean,
): Promise<void> {
  if (!canManageGiving(actor)) throw new PermissionError(actor.role, "manageGiving");

  if (archived) {
    const [live] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(funds)
      .where(isNull(funds.archivedAt));
    if ((live?.count ?? 0) <= 1) throw new InvalidInputError("fund.error.last");
  }

  const changed = await db
    .update(funds)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(funds.id, id))
    .returning({ id: funds.id });
  if (changed.length === 0) throw new InvalidInputError("fund.error.missing");
}

/** R13.21. What has come in to each fund over a period. */
export async function fundTotals(
  db: Tx,
  range: { from: string; to: string },
): Promise<Record<string, { cents: number; gifts: number }>> {
  const rows = await db
    .select({
      fundId: gifts.fundId,
      cents: sql<number>`coalesce(sum(${gifts.amountCents} - ${gifts.refundedCents}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(gifts)
    .where(
      and(
        settled,
        sql`${gifts.receivedOn} >= ${range.from}::date`,
        sql`${gifts.receivedOn} <= ${range.to}::date`,
      ),
    )
    .groupBy(gifts.fundId);

  const held: Record<string, { cents: number; gifts: number }> = {};
  for (const row of rows) held[row.fundId] = { cents: row.cents, gifts: row.count };
  return held;
}
