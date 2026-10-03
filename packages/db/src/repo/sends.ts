import { and, asc, desc, eq, inArray, lte, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { sends, sendRecipients } from "../schema/messaging";
import { PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import { canManageChurch } from "./church";
import { mergeInto, type AudienceChoice } from "./merge-rules";
import { recipientsFor } from "./audience";
import { emailConnection } from "./messaging";
import type { WriteActor } from "./people";

/**
 * R16.6. The send queue.
 *
 * A send is a record before it is an action. A church that closes the laptop
 * halfway through four hundred messages comes back to a job that carried on,
 * and the question after a send is which three did not arrive, so there is a
 * row for every address rather than a counter.
 *
 * Every message is merged at the moment it is queued. A person who changes
 * their name on Thursday does not retroactively change what Wednesday's
 * message said.
 */

export type BulkSendStatus = "scheduled" | "sending" | "sent" | "cancelled" | "failed";
export type RecipientStatus = "pending" | "sent" | "failed";

export interface SendProgress {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

export interface Send {
  id: string;
  subject: string;
  body: string;
  audienceName: string;
  status: BulkSendStatus;
  sendAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  reason: string | null;
  progress: SendProgress;
}

export interface SendRecipientRow {
  id: string;
  personId: string | null;
  toEmail: string;
  status: RecipientStatus;
  reason: string | null;
  sentAt: string | null;
}

export interface QueueInput {
  subject: string;
  body: string;
  audience: AudienceChoice;
  audienceName: string;
  /** ISO instant. Omitted means now. */
  sendAt?: string | null;
}

/** How many addresses one pass through the queue takes. */
export const BATCH = 25;

const progressOf = (rows: { status: string; n: number }[]): SendProgress => {
  const by = (name: string) => rows.find((r) => r.status === name)?.n ?? 0;
  const sent = by("sent");
  const failed = by("failed");
  const pending = by("pending");
  return { total: sent + failed + pending, sent, failed, pending };
};

/**
 * R16.6, R16.3. Queues a send, with the message already merged for each person.
 *
 * Refuses outright where the church has no mail account of its own. Bulk
 * sending on an allowance Hearth pays for is the thing that kills a
 * donation-funded platform, so the refusal is the product working.
 */
export async function queueSend(
  db: Tx,
  actor: WriteActor,
  input: QueueInput,
  churchName: string,
): Promise<{ id: string; recipients: number; noEmail: number }> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "manageMessaging");

  const subject = input.subject?.trim();
  if (!subject) throw new InvalidInputError("compose.error.subject");
  const body = input.body?.trim();
  if (!body) throw new InvalidInputError("compose.error.body");

  const account = await emailConnection(db);
  if (!account) throw new InvalidInputError("send.error.noAccount");

  const audience = await recipientsFor(db, input.audience, churchName);
  if (audience.recipients.length === 0) throw new InvalidInputError("send.error.nobody");

  const sendAt = input.sendAt ? new Date(input.sendAt) : new Date();
  if (Number.isNaN(sendAt.getTime())) throw new InvalidInputError("send.error.when");

  const [row] = await db
    .insert(sends)
    .values({
      tenantId: actor.tenantId,
      subject,
      body,
      audienceKind: input.audience.kind,
      audienceId: input.audience.id ?? null,
      audienceName: input.audienceName,
      sendAt,
      createdByUserId: actor.userId ?? null,
    })
    .returning({ id: sends.id });

  await db.insert(sendRecipients).values(
    audience.recipients.map((person) => ({
      tenantId: actor.tenantId,
      sendId: row!.id,
      personId: person.personId,
      toEmail: person.email,
      subject: mergeInto(subject, person.values),
      body: mergeInto(body, person.values),
    })),
  );

  return {
    id: row!.id,
    recipients: audience.recipients.length,
    noEmail: audience.noEmail,
  };
}

async function progressFor(db: Tx, sendIds: string[]): Promise<Map<string, SendProgress>> {
  const out = new Map<string, SendProgress>();
  if (sendIds.length === 0) return out;

  const rows = await db
    .select({
      sendId: sendRecipients.sendId,
      status: sendRecipients.status,
      n: sql<number>`count(*)::int`,
    })
    .from(sendRecipients)
    .where(inArray(sendRecipients.sendId, sendIds))
    .groupBy(sendRecipients.sendId, sendRecipients.status);

  for (const id of sendIds) {
    out.set(id, progressOf(rows.filter((r) => r.sendId === id)));
  }
  return out;
}

const shape = (row: typeof sends.$inferSelect, progress: SendProgress): Send => ({
  id: row.id,
  subject: row.subject,
  body: row.body,
  audienceName: row.audienceName,
  status: row.status as BulkSendStatus,
  sendAt: row.sendAt.toISOString(),
  startedAt: row.startedAt?.toISOString() ?? null,
  finishedAt: row.finishedAt?.toISOString() ?? null,
  reason: row.reason,
  progress,
});

/** R16.6. What this church has sent and what it has queued, newest first. */
export async function listSends(db: Tx, limit = 20): Promise<Send[]> {
  const rows = await db
    .select()
    .from(sends)
    .orderBy(desc(sends.createdAt))
    .limit(limit);

  const progress = await progressFor(db, rows.map((r) => r.id));
  return rows.map((row) => shape(row, progress.get(row.id)!));
}

export async function getSend(db: Tx, id: string): Promise<Send | null> {
  const [row] = await db.select().from(sends).where(eq(sends.id, id)).limit(1);
  if (!row) return null;

  const progress = await progressFor(db, [row.id]);
  return shape(row, progress.get(row.id)!);
}

/** R16.6. Every address in one send, so "which three did not arrive" has an answer. */
export async function sendRecipientsFor(
  db: Tx,
  sendId: string,
  options: { status?: RecipientStatus } = {},
): Promise<SendRecipientRow[]> {
  const rows = await db
    .select()
    .from(sendRecipients)
    .where(
      options.status
        ? and(eq(sendRecipients.sendId, sendId), eq(sendRecipients.status, options.status))
        : eq(sendRecipients.sendId, sendId),
    )
    .orderBy(asc(sendRecipients.toEmail))
    .limit(500);

  return rows.map((row) => ({
    id: row.id,
    personId: row.personId,
    toEmail: row.toEmail,
    status: row.status as RecipientStatus,
    reason: row.reason,
    sentAt: row.sentAt?.toISOString() ?? null,
  }));
}

/**
 * R16.6. Stops a send.
 *
 * Only before it has finished, and whatever has already gone has gone. Software
 * that claimed to recall a sent message would be lying.
 */
export async function cancelSend(db: Tx, actor: WriteActor, id: string): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "manageMessaging");

  const changed = await db
    .update(sends)
    .set({ status: "cancelled", finishedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(sends.id, id), inArray(sends.status, ["scheduled", "sending"])))
    .returning({ id: sends.id });
  if (changed.length === 0) throw new InvalidInputError("send.error.done");
}

/** R16.6. The sends that are due, for whatever is going to carry them. */
export async function dueSends(db: Tx, now = new Date()): Promise<string[]> {
  const rows = await db
    .select({ id: sends.id })
    .from(sends)
    .where(and(inArray(sends.status, ["scheduled", "sending"]), lte(sends.sendAt, now)))
    .orderBy(asc(sends.sendAt))
    .limit(10);
  return rows.map((row) => row.id);
}

/** R16.6. The next few addresses waiting in one send. */
export async function nextBatch(
  db: Tx,
  sendId: string,
  size = BATCH,
): Promise<{ id: string; toEmail: string; subject: string; body: string }[]> {
  const rows = await db
    .select({
      id: sendRecipients.id,
      toEmail: sendRecipients.toEmail,
      subject: sendRecipients.subject,
      body: sendRecipients.body,
    })
    .from(sendRecipients)
    .where(and(eq(sendRecipients.sendId, sendId), eq(sendRecipients.status, "pending")))
    .orderBy(asc(sendRecipients.createdAt))
    .limit(size);
  return rows;
}

/** R16.6. Marks the send as under way, so a screen can say it started. */
export async function markSending(db: Tx, sendId: string): Promise<void> {
  await db
    .update(sends)
    .set({ status: "sending", startedAt: sql`coalesce(${sends.startedAt}, now())`, updatedAt: new Date() })
    .where(and(eq(sends.id, sendId), eq(sends.status, "scheduled")));
}

/** R16.6. What happened to one address. */
export async function markRecipient(
  db: Tx,
  id: string,
  status: Exclude<RecipientStatus, "pending">,
  reason?: string | null,
): Promise<void> {
  await db
    .update(sendRecipients)
    .set({
      status,
      reason: reason?.slice(0, 500) ?? null,
      sentAt: new Date(),
    })
    .where(eq(sendRecipients.id, id));
}

/**
 * R16.6. Closes a send once nothing is left waiting.
 *
 * A send where every address failed is a failed send, because telling a church
 * its message was sent when none of it arrived is the worst thing this screen
 * could do.
 */
export async function finishIfDone(db: Tx, sendId: string): Promise<boolean> {
  const send = await getSend(db, sendId);
  if (!send || send.progress.pending > 0) return false;

  const failed = send.progress.sent === 0 && send.progress.failed > 0;
  await db
    .update(sends)
    .set({
      status: failed ? "failed" : "sent",
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(sends.id, sendId));
  return true;
}
