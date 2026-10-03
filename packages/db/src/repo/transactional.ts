import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { emailSends } from "../schema/messaging";
import { InvalidInputError } from "../errors";
import type { WriteActor } from "./people";

/**
 * R16.3. The shared transactional allowance.
 *
 * Hearth pays for a small amount of mail so that a church can be invited, reset
 * a password and answer a schedule request on its first day, before it has set
 * anything up. That is the whole purpose of it. Anything a church sends in
 * volume runs on the church's own account, which is R16.1.
 *
 * The allowance is a visible number rather than a quiet throttle, because a
 * church that cannot see it will blame the software the week its invitations
 * stop arriving.
 */

export const TRANSACTIONAL_PURPOSES = [
  "invitation", "password_reset", "checkin_receipt", "serving_request",
] as const;
export type TransactionalPurpose = (typeof TRANSACTIONAL_PURPOSES)[number];

/** Messages a church a calendar month, on the shared account. */
export const SHARED_MONTHLY_ALLOWANCE = 300;

export type SendStatus = "sent" | "failed" | "refused";
export type SendVia = "church" | "shared";

export interface Allowance {
  /** How many of the shared messages this month have been used. */
  used: number;
  allowance: number;
  remaining: number;
  /** The first day of next month, when the count starts again. */
  resetsOn: string;
}

export interface SendRecord {
  id: string;
  purpose: string;
  toEmail: string;
  via: SendVia;
  status: SendStatus;
  reason: string | null;
  sentAt: string;
}

/** The first day of the month this date falls in, as an ISO day. */
const monthStart = (at: Date): string =>
  `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, "0")}-01`;

const nextMonthStart = (at: Date): string => {
  const year = at.getUTCMonth() === 11 ? at.getUTCFullYear() + 1 : at.getUTCFullYear();
  const month = at.getUTCMonth() === 11 ? 1 : at.getUTCMonth() + 2;
  return `${year}-${String(month).padStart(2, "0")}-01`;
};

/**
 * R16.3. What is left of the shared allowance this month.
 *
 * Only messages that actually went out count. A message the mail server refused
 * cost the church nothing, so charging the allowance for it would be charging
 * for our own failure.
 */
export async function sharedAllowance(db: Tx, now = new Date()): Promise<Allowance> {
  const from = monthStart(now);

  const [row] = await db
    .select({ used: sql<number>`count(*)::int` })
    .from(emailSends)
    .where(and(
      eq(emailSends.via, "shared"),
      eq(emailSends.status, "sent"),
      gte(emailSends.sentAt, sql`${from}::date`),
    ));

  const used = row?.used ?? 0;
  return {
    used,
    allowance: SHARED_MONTHLY_ALLOWANCE,
    remaining: Math.max(SHARED_MONTHLY_ALLOWANCE - used, 0),
    resetsOn: nextMonthStart(now),
  };
}

export interface SendInput {
  purpose: TransactionalPurpose;
  toEmail: string;
  via: SendVia;
  status: SendStatus;
  reason?: string | null;
}

/** R16.3. Writes one line of the ledger. */
export async function recordSend(
  db: Tx,
  actor: WriteActor,
  input: SendInput,
): Promise<void> {
  if (!TRANSACTIONAL_PURPOSES.includes(input.purpose)) {
    throw new InvalidInputError("mail.error.purpose");
  }

  const toEmail = input.toEmail?.trim().toLowerCase();
  if (!toEmail) throw new InvalidInputError("mail.error.recipient");

  await db.insert(emailSends).values({
    tenantId: actor.tenantId,
    purpose: input.purpose,
    toEmail,
    via: input.via,
    status: input.status,
    reason: input.reason?.slice(0, 500) ?? null,
  });
}

/** R16.3. What has gone out lately, newest first. */
export async function recentSends(db: Tx, limit = 20): Promise<SendRecord[]> {
  const rows = await db
    .select()
    .from(emailSends)
    .orderBy(desc(emailSends.sentAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    purpose: row.purpose,
    toEmail: row.toEmail,
    via: row.via as SendVia,
    status: row.status as SendStatus,
    reason: row.reason,
    sentAt: row.sentAt.toISOString(),
  }));
}
