import { and, asc, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import type { Tx } from "../client";
import type { Permission } from "../permissions";
import { conversations, messages } from "../schema/messages";
import { members } from "../schema/members";
import { InvalidInputError } from "../errors";
import { PermissionError, canEditPeople, type TenantRole } from "../roles";
import { personForUser } from "./scope";
import { notifyRoles } from "./notifications";

/**
 * R16.9, R17.1. Messages written here and read here.
 *
 * Nothing is sent. No provider holds anything, no credential is stored and no
 * delivery is paid for, which is why this half of communication can exist in a
 * product given away.
 *
 * One thread between the office and one member. The office is a role rather
 * than a person: whoever is on staff this month answers, and the thread stays
 * with the church.
 */

export const SIDES = ["member", "church"] as const;
export type Side = (typeof SIDES)[number];

export interface Message {
  id: string;
  side: Side;
  body: string;
  createdAt: Date;
  authorUserId: string | null;
}

export interface Thread {
  id: string;
  memberId: string;
  /** Who it is with, for the staff list. */
  name: string;
  photoKey: string | null;
  lastMessageAt: Date;
  /** The opening of the last message, for the row. */
  lastLine: string;
  /** How many the reader has not read, from their own side. */
  unread: number;
  archived: boolean;
}

interface Actor {
  tenantId: string;
  role: TenantRole;
  userId?: string | null;
  permissions?: readonly Permission[] | null;
}

/** Whoever may edit a member may write to one. */
function guardStaff(actor: Actor): void {
  if (!canEditPeople(actor)) throw new PermissionError(actor.role, "editPerson");
}

/** A message is words. A box of spaces is not one. */
const clean = (body: string): string => body.trim();

/** The first line of a message, short enough for a row in a list. */
const opening = (body: string): string => {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > 140 ? `${flat.slice(0, 139)}…` : flat;
};

const lastLine = sql<string>`coalesce((
  select m.body from messages m
  where m.conversation_id = ${conversations.id}
  order by m.created_at desc
  limit 1
), '')`;

/**
 * R16.9. Every thread the office has, newest written to first.
 *
 * Unread counts what members have written since the office last read it, so a
 * thread the office answered is quiet until somebody writes again.
 */
export async function threadsForStaff(
  db: Tx,
  opts: { archivedOnly?: boolean } = {},
): Promise<Thread[]> {
  const rows = await db
    .select({
      id: conversations.id,
      memberId: conversations.memberId,
      first: members.firstName,
      last: members.lastName,
      photoKey: members.photoKey,
      lastMessageAt: conversations.lastMessageAt,
      archivedAt: conversations.archivedAt,
      body: lastLine,
      unread: sql<number>`(
        select count(*)::int from messages m
        where m.conversation_id = ${conversations.id}
          and m.side = 'member'
          and (${conversations.staffReadAt} is null or m.created_at > ${conversations.staffReadAt})
      )`,
    })
    .from(conversations)
    .innerJoin(members, eq(members.id, conversations.memberId))
    .where(
      opts.archivedOnly
        ? sql`${conversations.archivedAt} is not null`
        : isNull(conversations.archivedAt),
    )
    .orderBy(desc(conversations.lastMessageAt));

  return rows.map((one) => ({
    id: one.id,
    memberId: one.memberId,
    name: `${one.first} ${one.last}`.trim(),
    photoKey: one.photoKey,
    lastMessageAt: one.lastMessageAt,
    lastLine: opening(one.body),
    unread: one.unread,
    archived: one.archivedAt !== null,
  }));
}

/** R16.9. How many threads are waiting on the office, for the bell. */
export async function unreadForStaff(db: Tx): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(conversations)
    .where(
      and(
        isNull(conversations.archivedAt),
        sql`exists (
          select 1 from messages m
          where m.conversation_id = ${conversations.id}
            and m.side = 'member'
            and (${conversations.staffReadAt} is null or m.created_at > ${conversations.staffReadAt})
        )`,
      ),
    );
  return row?.count ?? 0;
}

/** R17.1. How many a member has not read, for the portal's own mark. */
export async function unreadForMember(db: Tx, memberId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        eq(conversations.memberId, memberId),
        eq(messages.side, "church"),
        or(
          isNull(conversations.memberReadAt),
          gt(messages.createdAt, conversations.memberReadAt),
        ),
      ),
    );
  return row?.count ?? 0;
}

export async function messagesIn(db: Tx, conversationId: string): Promise<Message[]> {
  const rows = await db
    .select({
      id: messages.id,
      side: messages.side,
      body: messages.body,
      createdAt: messages.createdAt,
      authorUserId: messages.authorUserId,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  return rows.map((one) => ({ ...one, side: one.side === "church" ? "church" : "member" }));
}

/** The thread with one member, whether or not anybody has written yet. */
export async function threadWithMember(
  db: Tx,
  memberId: string,
): Promise<{ id: string; memberReadAt: Date | null; staffReadAt: Date | null } | null> {
  const [row] = await db
    .select({
      id: conversations.id,
      memberReadAt: conversations.memberReadAt,
      staffReadAt: conversations.staffReadAt,
    })
    .from(conversations)
    .where(eq(conversations.memberId, memberId))
    .limit(1);
  return row ?? null;
}

/**
 * R16.9. The thread with one member, started if there is not one yet.
 *
 * One a member, for the life of the church. Somebody who wrote in August and
 * writes again in March is writing into the same thread, so neither side has
 * to go looking for what was said.
 */
export async function openThread(db: Tx, tenantId: string, memberId: string): Promise<string> {
  const held = await threadWithMember(db, memberId);
  if (held) return held.id;

  const [made] = await db
    .insert(conversations)
    .values({ tenantId, memberId })
    .onConflictDoNothing()
    .returning({ id: conversations.id });

  if (made) return made.id;

  // Two writers at once, which the unique index settles.
  const again = await threadWithMember(db, memberId);
  if (!again) throw new InvalidInputError("inbox.error.thread");
  return again.id;
}

/**
 * R16.9. A message into a thread.
 *
 * The side is who it reads as rather than who typed it, so a thread stays
 * legible when the volunteer who answered it has left the church.
 */
export async function writeMessage(
  db: Tx,
  actor: Actor,
  input: { memberId: string; side: Side; body: string },
): Promise<string> {
  if (input.side === "church") guardStaff(actor);

  const body = clean(input.body);
  if (!body) throw new InvalidInputError("inbox.error.empty");

  const threadId = await openThread(db, actor.tenantId, input.memberId);
  const now = new Date();

  const [made] = await db
    .insert(messages)
    .values({
      tenantId: actor.tenantId,
      conversationId: threadId,
      side: input.side,
      authorUserId: actor.userId ?? null,
      body,
    })
    .returning({ id: messages.id });

  /* Writing is reading: the side that just wrote has nothing unread, and a
     thread somebody answered should not sit in their own unread list. */
  await db
    .update(conversations)
    .set({
      lastMessageAt: now,
      updatedAt: now,
      archivedAt: null,
      ...(input.side === "church" ? { staffReadAt: now } : { memberReadAt: now }),
    })
    .where(eq(conversations.id, threadId));

  /*
   * R24.6. A member writing in rings the bell, once per thread rather than
   * once per message: somebody writing four lines in a minute is one thing
   * for the office to answer, not four.
   */
  if (input.side === "member") {
    const [who] = await db
      .select({ first: members.firstName, last: members.lastName })
      .from(members)
      .where(eq(members.id, input.memberId))
      .limit(1);

    await notifyRoles(db, actor.tenantId, ["owner", "admin", "staff"], {
      kind: "message",
      messageKey: "bell.message",
      params: { name: `${who?.first ?? ""} ${who?.last ?? ""}`.trim() },
      href: `/messages?id=${threadId}`,
    }, { onlyIfUnread: true });
  }

  return made!.id;
}

/** R16.9. The reader has seen everything in this thread up to now. */
export async function markThreadRead(
  db: Tx,
  conversationId: string,
  side: Side,
): Promise<void> {
  const now = new Date();
  await db
    .update(conversations)
    .set(side === "church" ? { staffReadAt: now } : { memberReadAt: now })
    .where(eq(conversations.id, conversationId));
}

/** R2.13. Off the office's list, kept in the records. A reply brings it back. */
export async function setThreadArchived(
  db: Tx,
  actor: Actor,
  conversationId: string,
  archived: boolean,
): Promise<void> {
  guardStaff(actor);
  await db
    .update(conversations)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

/** R17.1. The member behind an account, for the portal's own screens. */
export async function memberForUser(db: Tx, userId: string): Promise<string | null> {
  return personForUser(db, userId);
}
