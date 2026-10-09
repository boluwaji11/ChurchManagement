import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { conversations, conversationPeople, messages, messageDrafts } from "../schema/messages";
import { members } from "../schema/members";
import { groupMemberships, groups } from "../schema/groups";
import { teamMembers, teams } from "../schema/serving";
import { InvalidInputError } from "../errors";
import { PermissionError } from "../roles";

/**
 * R16.9, R17.1. Messages written here and read here.
 *
 * Nothing is sent. No provider holds anything, no credential is stored and no
 * delivery is paid for, which is why this half of communication can exist in a
 * product given away.
 *
 * A conversation has people in it. The office is one of them, as a role rather
 * than a person, so whoever is on staff this month answers and the thread
 * belongs to the church. Everybody else is a member, and the read mark is per
 * person: what one reader has seen is theirs alone.
 */

/** Whoever is reading, from the session. */
export interface Reader {
  tenantId: string;
  userId: string;
  /** Their own person record, where their account is tied to one. */
  memberId: string | null;
  /** Whether they answer for the church. */
  office: boolean;
}

/**
 * Who a message is addressed to.
 *
 * "office", or a member's own readable address. A row id never appears in a
 * link in this product, and a conversation is found by who it is with rather
 * than by which row holds it.
 */
export type Target = { office: true } | { office: false; slug: string };

export interface Message {
  id: string;
  body: string;
  createdAt: Date;
  /** Written as the church. */
  fromOffice: boolean;
  authorMemberId: string | null;
  /** Who it reads as, already resolved. Empty for the office. */
  authorName: string;
  authorPhotoKey: string | null;
  /** Whether the reader wrote it. */
  mine: boolean;
}

export interface Thread {
  id: string;
  kind: string;
  /** Its address: "office", or who it is with. */
  key: string;
  /** Who it is with, from this reader's side. Null means the church office. */
  withMemberId: string | null;
  withName: string;
  withPhotoKey: string | null;
  lastLine: string;
  lastAt: Date;
  /** Whether the last line is the reader's own. */
  lastMine: boolean;
  unread: number;
  archived: boolean;
}

export interface Recipient {
  /** "office", or a member's own readable address. */
  value: string;
  name: string;
  photoKey: string | null;
  /** Why they are on the list: the group or team they lead. */
  through: string | null;
}

export interface Draft {
  target: string;
  name: string;
  body: string;
  updatedAt: Date;
}

const clean = (body: string): string => body.trim();

/** The first line of a message, short enough for a row in a list. */
const opening = (body: string): string => {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > 140 ? `${flat.slice(0, 139)}…` : flat;
};

/**
 * The reader's own row in a conversation, and what is unread against it.
 *
 * A staff member who is also in a thread as themselves has two rows in it, so
 * the office row is preferred: answering for the church is the errand they
 * opened the inbox for.
 */
const MINE = sql`coalesce(
  (p.office and m.from_office)
  or (not p.office and p.member_id is not null and m.author_member_id = p.member_id)
, false)`;

interface Row {
  id: string;
  kind: string;
  last_message_at: string | Date;
  archived_at: Date | null;
  i_am_office: boolean;
  last_body: string | null;
  last_mine: boolean | null;
  unread: number;
}

async function readThreads(
  db: Tx,
  reader: Reader,
  opts: { archivedOnly?: boolean; sent?: boolean; limit?: number } = {},
): Promise<Thread[]> {
  const rows = (await db.execute(sql`
    select distinct on (c.id)
           c.id, c.kind, c.last_message_at, c.archived_at,
           p.office as i_am_office,
           (select m.body from messages m
             where m.conversation_id = c.id order by m.created_at desc limit 1) as last_body,
           (select ${MINE} from messages m
             where m.conversation_id = c.id order by m.created_at desc limit 1) as last_mine,
           (select count(*)::int from messages m
             where m.conversation_id = c.id
               and m.created_at > coalesce(p.last_read_at, timestamptz '-infinity')
               and not ${MINE}) as unread
      from conversations c
      join conversation_people p on p.conversation_id = c.id
       and ((p.office and ${reader.office}) or (p.member_id = ${reader.memberId ?? null}))
     where ${opts.archivedOnly ? sql`c.archived_at is not null` : sql`c.archived_at is null`}
       and exists (select 1 from messages m where m.conversation_id = c.id)
       ${opts.sent
          ? sql`and exists (select 1 from messages m where m.conversation_id = c.id and ${MINE})`
          : sql``}
     order by c.id, p.office desc
  `)) as unknown as Row[];

  if (rows.length === 0) return [];

  const ids = rows.map((one) => one.id);
  const people = await db
    .select({
      conversationId: conversationPeople.conversationId,
      memberId: conversationPeople.memberId,
      office: conversationPeople.office,
      first: members.firstName,
      last: members.lastName,
      slug: members.slug,
      photoKey: members.photoKey,
    })
    .from(conversationPeople)
    .leftJoin(members, eq(members.id, conversationPeople.memberId))
    .where(inArray(conversationPeople.conversationId, ids));

  const out = rows.map((row) => {
    const here = people.filter((one) => one.conversationId === row.id);
    /* Who it is with is whoever in it is not the reader. */
    const other = here.find((one) =>
      row.i_am_office ? !one.office : one.memberId !== reader.memberId);

    return {
      id: row.id,
      kind: row.kind,
      key: other && !other.office ? other.slug ?? "" : "office",
      withMemberId: other?.memberId ?? null,
      withName: other && !other.office ? `${other.first} ${other.last}`.trim() : "",
      withPhotoKey: other?.photoKey ?? null,
      lastLine: opening(row.last_body ?? ""),
      lastAt: new Date(row.last_message_at),
      lastMine: Boolean(row.last_mine),
      unread: row.unread,
      archived: row.archived_at !== null,
    };
  });

  out.sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
  return opts.limit ? out.slice(0, opts.limit) : out;
}

/** R16.9. Every thread this reader is in, newest written to first. */
export const inboxFor = (
  db: Tx,
  reader: Reader,
  opts: { archivedOnly?: boolean; limit?: number } = {},
): Promise<Thread[]> => readThreads(db, reader, opts);

/** R16.9. The threads this reader has written into. */
export const sentFor = (db: Tx, reader: Reader, limit = 50): Promise<Thread[]> =>
  readThreads(db, reader, { sent: true, limit });

/**
 * R16.9. How many conversations are waiting on this reader.
 *
 * One statement, because every page in the product renders this number on its
 * way to the browser: the shell asks for it before anything else is drawn.
 */
export async function unreadFor(db: Tx, reader: Reader): Promise<number> {
  const rows = (await db.execute(sql`
    select count(*)::int as waiting from (
      select distinct c.id
        from conversations c
        join conversation_people p on p.conversation_id = c.id
         and ((p.office and ${reader.office}) or (p.member_id = ${reader.memberId ?? null}))
       where c.archived_at is null
         and exists (
           select 1 from messages m
            where m.conversation_id = c.id
              and m.created_at > coalesce(p.last_read_at, timestamptz '-infinity')
              and not ${MINE}
         )
    ) waiting
  `)) as unknown as { waiting: number }[];
  return rows[0]?.waiting ?? 0;
}

/** R16.9. Everything said in one thread, oldest first. */
export async function messagesIn(
  db: Tx,
  reader: Reader,
  conversationId: string,
): Promise<Message[]> {
  const rows = await db
    .select({
      id: messages.id,
      body: messages.body,
      createdAt: messages.createdAt,
      fromOffice: messages.fromOffice,
      authorMemberId: messages.authorMemberId,
      first: members.firstName,
      last: members.lastName,
      photoKey: members.photoKey,
    })
    .from(messages)
    .leftJoin(members, eq(members.id, messages.authorMemberId))
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  return rows.map((one) => ({
    id: one.id,
    body: one.body,
    createdAt: one.createdAt,
    fromOffice: one.fromOffice,
    authorMemberId: one.authorMemberId,
    authorName: one.fromOffice ? "" : `${one.first ?? ""} ${one.last ?? ""}`.trim(),
    authorPhotoKey: one.fromOffice ? null : one.photoKey,
    mine: one.fromOffice
      ? reader.office
      : one.authorMemberId !== null && one.authorMemberId === reader.memberId,
  }));
}

/** Whether this reader is in a conversation at all. */
export async function canRead(
  db: Tx,
  reader: Reader,
  conversationId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: conversationPeople.id })
    .from(conversationPeople)
    .where(and(
      eq(conversationPeople.conversationId, conversationId),
      reader.office && reader.memberId
        ? sql`(${conversationPeople.office} or ${conversationPeople.memberId} = ${reader.memberId})`
        : reader.office
          ? eq(conversationPeople.office, true)
          : eq(conversationPeople.memberId, reader.memberId ?? ""),
    ))
    .limit(1);
  return Boolean(row);
}

/**
 * R16.9. The thread between these two, started if there is not one yet.
 *
 * One a pair, for the life of the church, so somebody who wrote in August and
 * writes again in March writes into the same place.
 */
export async function openThread(
  db: Tx,
  tenantId: string,
  between: { office: boolean; memberIds: string[] },
): Promise<string> {
  const kind = between.office ? "church" : "direct";
  const people = [...new Set(between.memberIds)].sort();

  const held = (await db.execute(sql`
    select c.id from conversations c
     where c.tenant_id = ${tenantId}
       and c.kind = ${kind}
       and (select count(*) from conversation_people p where p.conversation_id = c.id)
           = ${people.length + (between.office ? 1 : 0)}
       ${between.office
          ? sql`and exists (select 1 from conversation_people p
                             where p.conversation_id = c.id and p.office)`
          : sql``}
       and not exists (
         select 1 from conversation_people p
          where p.conversation_id = c.id
            and p.member_id is not null
            and p.member_id not in (${sql.join(people.map((one) => sql`${one}`), sql`, `)})
       )
     limit 1
  `)) as unknown as { id: string }[];

  if (held[0]) return held[0].id;

  const [made] = await db
    .insert(conversations)
    .values({ tenantId, kind })
    .returning({ id: conversations.id });

  const rows = people.map((memberId) => ({
    tenantId, conversationId: made!.id, memberId, office: false,
  }));
  if (between.office) {
    rows.push({ tenantId, conversationId: made!.id, memberId: null as never, office: true });
  }
  await db.insert(conversationPeople).values(rows);

  return made!.id;
}

/**
 * R16.9. A message, to whoever it is addressed to.
 *
 * Writing is reading: the thread does not come back to the writer's own
 * unread list a second after they sent it.
 */
export async function sendMessage(
  db: Tx,
  reader: Reader,
  input: { to: Target; body: string },
): Promise<{ threadId: string; id: string }> {
  const body = clean(input.body);
  if (!body) throw new InvalidInputError("inbox.error.empty");

  /* Writing as the church is what the office does; writing to it is what
     everybody else does. */
  const asOffice = reader.office && !input.to.office;
  if (!asOffice && !reader.memberId) throw new InvalidInputError("member.error.noRecord");
  if (input.to.office && reader.office && !reader.memberId) {
    throw new InvalidInputError("member.error.noRecord");
  }

  const them = input.to.office ? null : await memberBySlug(db, input.to.slug);
  if (!input.to.office && !them) throw new InvalidInputError("member.error.noRecord");

  const threadId = input.to.office
    ? await openThread(db, reader.tenantId, { office: true, memberIds: [reader.memberId!] })
    : asOffice
      ? await openThread(db, reader.tenantId, { office: true, memberIds: [them!] })
      : await openThread(db, reader.tenantId, {
          office: false,
          memberIds: [reader.memberId!, them!],
        });

  const [made] = await db
    .insert(messages)
    .values({
      tenantId: reader.tenantId,
      conversationId: threadId,
      fromOffice: asOffice,
      authorMemberId: asOffice ? null : reader.memberId,
      authorUserId: reader.userId,
      body,
    })
    .returning({ id: messages.id });

  const now = new Date();
  await db
    .update(conversations)
    .set({ lastMessageAt: now, updatedAt: now, archivedAt: null })
    .where(eq(conversations.id, threadId));

  await db
    .update(conversationPeople)
    .set({ lastReadAt: now })
    .where(and(
      eq(conversationPeople.conversationId, threadId),
      asOffice
        ? eq(conversationPeople.office, true)
        : eq(conversationPeople.memberId, reader.memberId!),
    ));

  await dropDraft(db, reader, input.to.office ? "office" : them!);

  return { threadId, id: made!.id };
}

/** The person behind an address, where there is one. */
export async function memberBySlug(db: Tx, slug: string): Promise<string | null> {
  const [row] = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.slug, slug))
    .limit(1);
  return row?.id ?? null;
}

/**
 * R16.9. The thread at an address, where this reader has one.
 *
 * The address is who it is with, so a link to a conversation is a link to a
 * person rather than to a row, and it survives whatever the row is called.
 *
 * Found in one statement rather than by reading the whole list and looking
 * through it: this runs every time somebody opens a conversation, and a panel
 * that takes a second to answer a press reads as broken.
 */
export async function threadAt(
  db: Tx,
  reader: Reader,
  key: string,
): Promise<Thread | null> {
  const rows = (await db.execute(sql`
    select c.id, c.kind, c.last_message_at, c.archived_at, p.office as i_am_office
      from conversations c
      join conversation_people p on p.conversation_id = c.id
       and ((p.office and ${reader.office}) or (p.member_id = ${reader.memberId ?? null}))
     where ${key === "office"
        ? sql`exists (select 1 from conversation_people q
                       where q.conversation_id = c.id and q.office)`
        : sql`exists (select 1 from conversation_people q
                        join members w on w.id = q.member_id
                       where q.conversation_id = c.id and w.slug = ${key})`}
     order by p.office desc, c.last_message_at desc
     limit 1
  `)) as unknown as {
    id: string; kind: string; last_message_at: string | Date;
    archived_at: Date | null; i_am_office: boolean;
  }[];

  const row = rows[0];
  if (!row) return null;

  const [other] = key === "office"
    ? []
    : await db
        .select({
          id: members.id, first: members.firstName, last: members.lastName,
          photoKey: members.photoKey,
        })
        .from(members)
        .where(eq(members.slug, key))
        .limit(1);

  return {
    id: row.id,
    kind: row.kind,
    key,
    withMemberId: other?.id ?? null,
    withName: other ? `${other.first} ${other.last}`.trim() : "",
    withPhotoKey: other?.photoKey ?? null,
    /* The list carries these; an open conversation shows its own lines. */
    lastLine: "",
    lastAt: new Date(row.last_message_at),
    lastMine: false,
    unread: 0,
    archived: row.archived_at !== null,
  };
}

/** R16.9. The reader has seen everything in this thread up to now. */
export async function markThreadRead(
  db: Tx,
  reader: Reader,
  conversationId: string,
): Promise<void> {
  await db
    .update(conversationPeople)
    .set({ lastReadAt: new Date() })
    .where(and(
      eq(conversationPeople.conversationId, conversationId),
      reader.office
        ? eq(conversationPeople.office, true)
        : eq(conversationPeople.memberId, reader.memberId ?? ""),
    ));
}

/** R2.13. Off the list, kept in the records. A reply brings it back. */
export async function setThreadArchived(
  db: Tx,
  reader: Reader,
  conversationId: string,
  archived: boolean,
): Promise<void> {
  if (!(await canRead(db, reader, conversationId))) {
    throw new PermissionError(reader.office ? "staff" : "member", "editPerson");
  }
  await db
    .update(conversations)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

/**
 * R16.9. Who this reader may write to.
 *
 * The office, and whoever leads something they are part of. A member with a
 * question about Tuesday wants their group leader, and a directory of four
 * hundred people in a To field is how they end up writing to a stranger.
 */
export async function recipientsFor(db: Tx, reader: Reader): Promise<Recipient[]> {
  if (!reader.memberId) return [];

  const mine = db
    .select({ groupId: groupMemberships.groupId })
    .from(groupMemberships)
    .where(eq(groupMemberships.memberId, reader.memberId));

  const groupLeaders = await db
    .select({
      id: members.id,
      slug: members.slug,
      first: members.firstName,
      last: members.lastName,
      photoKey: members.photoKey,
      through: groups.name,
    })
    .from(groupMemberships)
    .innerJoin(members, eq(members.id, groupMemberships.memberId))
    .innerJoin(groups, eq(groups.id, groupMemberships.groupId))
    .where(and(
      inArray(groupMemberships.groupId, mine),
      inArray(groupMemberships.role, ["leader", "coleader"]),
      sql`${members.archivedAt} is null`,
      sql`${members.id} <> ${reader.memberId}`,
    ));

  const myTeams = db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.memberId, reader.memberId));

  const teamLeaders = await db
    .select({
      id: members.id,
      slug: members.slug,
      first: members.firstName,
      last: members.lastName,
      photoKey: members.photoKey,
      through: teams.name,
    })
    .from(teamMembers)
    .innerJoin(members, eq(members.id, teamMembers.memberId))
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(and(
      inArray(teamMembers.teamId, myTeams),
      eq(teamMembers.role, "leader"),
      sql`${members.archivedAt} is null`,
      sql`${members.id} <> ${reader.memberId}`,
    ));

  const out: Recipient[] = [];
  for (const one of [...groupLeaders, ...teamLeaders]) {
    if (out.some((held) => held.value === one.slug)) continue;
    out.push({
      value: one.slug,
      name: `${one.first} ${one.last}`.trim(),
      photoKey: one.photoKey,
      through: one.through,
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/**
 * R16.9. Whoever in the church answers to this name.
 *
 * For the office, which writes to anybody: the To field is a lookup rather
 * than a list, because a church of four hundred cannot be scrolled.
 */
export async function peopleNamed(
  db: Tx,
  query: string,
  limit = 10,
): Promise<Recipient[]> {
  const want = `%${query.trim().toLowerCase()}%`;
  if (query.trim().length < 2) return [];

  const rows = await db
    .select({
      slug: members.slug,
      first: members.firstName,
      last: members.lastName,
      preferred: members.preferredName,
      photoKey: members.photoKey,
    })
    .from(members)
    .where(and(
      sql`${members.archivedAt} is null`,
      sql`(
        lower(${members.firstName}) like ${want}
        or lower(${members.lastName}) like ${want}
        or lower(coalesce(${members.preferredName}, '')) like ${want}
        or lower(${members.firstName} || ' ' || ${members.lastName}) like ${want}
      )`,
    ))
    .orderBy(asc(members.lastName), asc(members.firstName))
    .limit(limit);

  return rows.map((one) => ({
    value: one.slug,
    name: `${one.preferred ?? one.first} ${one.last}`.trim(),
    photoKey: one.photoKey,
    through: null,
  }));
}

/** R16.9. What this reader has started and not sent. */
export async function draftsFor(db: Tx, reader: Reader): Promise<Draft[]> {
  const rows = await db
    .select({
      target: messageDrafts.target,
      body: messageDrafts.body,
      updatedAt: messageDrafts.updatedAt,
      first: members.firstName,
      last: members.lastName,
      slug: members.slug,
    })
    .from(messageDrafts)
    .leftJoin(members, sql`${members.id}::text = ${messageDrafts.target}`)
    .where(eq(messageDrafts.userId, reader.userId));

  return rows
    .filter((one) => one.body.trim().length > 0)
    .map((one) => ({
      target: one.target === "office" ? "office" : one.slug ?? one.target,
      name: one.target === "office" ? "" : `${one.first ?? ""} ${one.last ?? ""}`.trim(),
      body: one.body,
      updatedAt: one.updatedAt,
    }))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/** R16.9. A draft, kept as it is typed. */
export async function saveDraft(
  db: Tx,
  reader: Reader,
  /** "office", or whoever it is addressed to. */
  key: string,
  body: string,
): Promise<void> {
  const target = key === "office" ? "office" : (await memberBySlug(db, key)) ?? key;
  if (!body.trim()) {
    await dropDraft(db, reader, target);
    return;
  }
  await db
    .insert(messageDrafts)
    .values({ tenantId: reader.tenantId, userId: reader.userId, target, body })
    .onConflictDoUpdate({
      target: [messageDrafts.tenantId, messageDrafts.userId, messageDrafts.target],
      set: { body, updatedAt: new Date() },
    });
}

export async function dropDraft(db: Tx, reader: Reader, target: string): Promise<void> {
  await db
    .delete(messageDrafts)
    .where(and(eq(messageDrafts.userId, reader.userId), eq(messageDrafts.target, target)));
}
