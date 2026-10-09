import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import {
  conversations, conversationPeople, messages, messageDrafts, messageReactions,
} from "../schema/messages";
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
export type Target =
  | { office: true }
  | { office: false; slug: string }
  | { office: false; group: string }
  | { office: false; team: string };

/** R16.9. The marks a church may put against a message. */
export const REACTIONS = ["\u{1F44D}", "\u2764\uFE0F", "\u{1F64F}", "\u{1F602}", "\u{1F389}", "\u{1F622}"] as const;

export interface Reaction {
  emoji: string;
  count: number;
  /** Whether this reader is one of them. */
  mine: boolean;
}

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
  /** R16.9. What has been put against it, most used first. */
  reactions: Reaction[];
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
  /** "office", a group or team address, or a member's own. */
  value: string;
  name: string;
  photoKey: string | null;
  /** Why they are on the list: the group or team they lead. */
  through: string | null;
  /** Whether it reaches everybody in a group rather than one person. */
  whole?: boolean;
}

export interface Draft {
  target: string;
  name: string;
  photoKey: string | null;
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
const mineFor = (reader: Reader) => sql`coalesce(
  (${reader.office} and m.from_office)
  or (m.author_member_id = ${reader.memberId ?? null})
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
  opts: { archivedOnly?: boolean; limit?: number } = {},
): Promise<Thread[]> {
  const MINE = mineFor(reader);
  const me = reader.memberId ?? null;

  const rows = (await db.execute(sql`
    select distinct on (c.id)
           c.id, c.kind, c.last_message_at, c.archived_at,
           coalesce(p.office, false) as i_am_office,
           (select m.body from messages m
             where m.conversation_id = c.id order by m.created_at desc limit 1) as last_body,
           (select ${MINE} from messages m
             where m.conversation_id = c.id order by m.created_at desc limit 1) as last_mine,
           (select count(*)::int from messages m
             where m.conversation_id = c.id
               and m.created_at > coalesce(p.last_read_at, timestamptz '-infinity')
               and not ${MINE}) as unread
      from conversations c
      left join conversation_people p on p.conversation_id = c.id
       and ((p.office and ${reader.office}) or (p.member_id = ${me}))
     where ${opts.archivedOnly ? sql`c.archived_at is not null` : sql`c.archived_at is null`}
       and exists (select 1 from messages m where m.conversation_id = c.id)
       and (
         p.id is not null
         /* R9.7. A group's thread belongs to whoever is in the group now,
            read here rather than copied into a roster that goes stale. */
         /* R9.7. A group's conversation belongs to the group, so it is not
            in the office's inbox unless the office is in that group or has
            written into it. Thirty groups talking among themselves is not a
            church's post. */
         or (c.group_id is not null and exists (
              select 1 from group_memberships gm
               where gm.group_id = c.group_id and gm.member_id = ${me}))
         or (c.team_id is not null and exists (
              select 1 from team_members tm
               where tm.team_id = c.team_id and tm.member_id = ${me}))
       )
     order by c.id, p.office desc nulls last
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

  /* What a group thread is called is the group's own name. */
  const named = await db
    .select({
      id: conversations.id,
      groupName: groups.name,
      groupSlug: groups.slug,
      teamName: teams.name,
      teamSlug: teams.slug,
    })
    .from(conversations)
    .leftJoin(groups, eq(groups.id, conversations.groupId))
    .leftJoin(teams, eq(teams.id, conversations.teamId))
    .where(inArray(conversations.id, ids));

  const out = rows.map((row) => {
    const here = people.filter((one) => one.conversationId === row.id);
    const whose = named.find((one) => one.id === row.id);

    const other = here.find((one) =>
      row.i_am_office ? !one.office : one.memberId !== reader.memberId);

    const key = whose?.groupSlug
      ? `group/${whose.groupSlug}`
      : whose?.teamSlug
        ? `team/${whose.teamSlug}`
        : other && !other.office
          ? other.slug ?? ""
          : "office";

    const name = whose?.groupName
      ?? whose?.teamName
      ?? (other && !other.office ? `${other.first} ${other.last}`.trim() : "");

    return {
      id: row.id,
      kind: row.kind,
      key,
      withMemberId: whose?.groupSlug || whose?.teamSlug ? null : other?.memberId ?? null,
      withName: name,
      withPhotoKey: whose?.groupSlug || whose?.teamSlug ? null : other?.photoKey ?? null,
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

/**
 * R16.9. How many conversations are waiting on this reader.
 *
 * One statement, because every page in the product renders this number on its
 * way to the browser: the shell asks for it before anything else is drawn.
 */
export async function unreadFor(db: Tx, reader: Reader): Promise<number> {
  const MINE = mineFor(reader);
  const me = reader.memberId ?? null;

  const rows = (await db.execute(sql`
    select count(*)::int as waiting from (
      select distinct c.id
        from conversations c
        left join conversation_people p on p.conversation_id = c.id
         and ((p.office and ${reader.office}) or (p.member_id = ${me}))
       where c.archived_at is null
         and (
           p.id is not null
           or (c.group_id is not null and exists (
                select 1 from group_memberships gm
                 where gm.group_id = c.group_id and gm.member_id = ${me}))
           or (c.team_id is not null and exists (
                select 1 from team_members tm
                 where tm.team_id = c.team_id and tm.member_id = ${me}))
         )
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

  const marks = rows.length === 0
    ? []
    : await db
        .select({
          messageId: messageReactions.messageId,
          emoji: messageReactions.emoji,
          memberId: messageReactions.memberId,
        })
        .from(messageReactions)
        .where(inArray(messageReactions.messageId, rows.map((one) => one.id)));

  const against = (id: string): Reaction[] => {
    const here = marks.filter((one) => one.messageId === id);
    const out: Reaction[] = [];
    for (const one of here) {
      const held = out.find((each) => each.emoji === one.emoji);
      if (held) {
        held.count += 1;
        held.mine = held.mine || one.memberId === reader.memberId;
      } else {
        out.push({ emoji: one.emoji, count: 1, mine: one.memberId === reader.memberId });
      }
    }
    return out.sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
  };

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
    reactions: against(one.id),
  }));
}

/**
 * R16.9. A mark put against a message, or taken off it again.
 *
 * The same press both ways, because that is what everybody's hands already
 * expect, and the row is theirs alone so nobody can take off somebody else's.
 */
export async function react(
  db: Tx,
  reader: Reader,
  messageId: string,
  emoji: string,
): Promise<void> {
  if (!reader.memberId) throw new InvalidInputError("member.error.noRecord");
  if (!(REACTIONS as readonly string[]).includes(emoji)) {
    throw new InvalidInputError("inbox.error.mark");
  }

  const [said] = await db
    .select({ conversationId: messages.conversationId })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);
  if (!said) throw new InvalidInputError("inbox.error.thread");
  if (!(await canRead(db, reader, said.conversationId))) {
    throw new PermissionError(reader.office ? "staff" : "member", "editPerson");
  }

  const [held] = await db
    .select({ id: messageReactions.id })
    .from(messageReactions)
    .where(and(
      eq(messageReactions.messageId, messageId),
      eq(messageReactions.memberId, reader.memberId),
      eq(messageReactions.emoji, emoji),
    ))
    .limit(1);

  if (held) {
    await db.delete(messageReactions).where(eq(messageReactions.id, held.id));
    return;
  }

  await db
    .insert(messageReactions)
    .values({
      tenantId: reader.tenantId,
      messageId,
      memberId: reader.memberId,
      emoji,
    })
    .onConflictDoNothing();
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

  const toGroup = !input.to.office && "group" in input.to ? input.to.group : null;
  const toTeam = !input.to.office && "team" in input.to ? input.to.team : null;
  const toPerson = !input.to.office && "slug" in input.to ? input.to.slug : null;

  /*
   * R16.9, R3.2. Only the office writes to a person by name.
   *
   * A member writes to the church, or to a group or team they are part of.
   * Anything else would be the church's own privacy settings undone by a
   * message box.
   */
  if (toPerson && !reader.office) throw new PermissionError("member", "editPerson");

  /*
   * Writing as the church is what the office does.
   *
   * Inside a group it writes as itself where it is in the group: a leader who
   * happens to be on staff is in their own group as themselves, and a line
   * from "the church" in the middle of their own group would read as somebody
   * else entirely. Where it is not in the group, it writes as the church.
   */
  const inside = toGroup || toTeam
    ? await memberOf(db, reader, { group: toGroup ?? undefined, team: toTeam ?? undefined })
    : false;
  const asOffice = reader.office && (Boolean(toPerson) || ((Boolean(toGroup) || Boolean(toTeam)) && !inside));
  if (!asOffice && !reader.memberId) throw new InvalidInputError("member.error.noRecord");

  const them = toPerson ? await memberBySlug(db, toPerson) : null;
  if (toPerson && !them) throw new InvalidInputError("member.error.noRecord");

  const threadId = toGroup
    ? await openWhole(db, reader, { group: toGroup })
    : toTeam
      ? await openWhole(db, reader, { team: toTeam })
      : input.to.office
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

  /* R9.7. Writing into something puts the writer in it, which is how a group
     thread the office answered turns up in the office's own inbox while the
     ones it has never touched stay out of it. */
  await db
    .insert(conversationPeople)
    .values({
      tenantId: reader.tenantId,
      conversationId: threadId,
      memberId: asOffice ? null : reader.memberId,
      office: asOffice,
      lastReadAt: now,
    })
    .onConflictDoNothing();

  await markThreadRead(db, reader, threadId);

  await dropDraft(
    db,
    reader,
    input.to.office ? "office" : toGroup ? `group/${toGroup}` : toTeam ? `team/${toTeam}` : them!,
  );

  return { threadId, id: made!.id };
}

/**
 * R9.7. The thread a group or a team has, started the first time somebody
 * writes into it.
 *
 * Nobody is written into it: who is in a group thread is whoever is in the
 * group at the moment they open it.
 */
/** R9.7. Whether this reader is in the group or team themselves. */
async function memberOf(
  db: Tx,
  reader: Reader,
  whose: { group?: string; team?: string },
): Promise<boolean> {
  if (!reader.memberId) return false;

  const [row] = whose.group
    ? await db
        .select({ id: groupMemberships.id })
        .from(groupMemberships)
        .innerJoin(groups, eq(groups.id, groupMemberships.groupId))
        .where(and(
          eq(groups.slug, whose.group),
          eq(groupMemberships.memberId, reader.memberId),
        ))
        .limit(1)
    : await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .innerJoin(teams, eq(teams.id, teamMembers.teamId))
        .where(and(
          eq(teams.slug, whose.team!),
          eq(teamMembers.memberId, reader.memberId),
        ))
        .limit(1);

  return Boolean(row);
}

/** R9.7. Whether this reader may write into the group or team at all. */
async function inIt(
  db: Tx,
  reader: Reader,
  whose: { group?: string; team?: string },
): Promise<boolean> {
  /* The office speaks for the church, so it can reach any group. A member
     reaches the ones they are in. */
  if (reader.office) return true;
  return memberOf(db, reader, whose);
}

async function openWhole(
  db: Tx,
  reader: Reader,
  whose: { group?: string; team?: string },
): Promise<string> {
  const standing = await inIt(db, reader, whose);
  if (!standing) throw new PermissionError(reader.office ? "staff" : "member", "editPerson");

  const [held] = whose.group
    ? await db
        .select({ id: conversations.id })
        .from(conversations)
        .innerJoin(groups, eq(groups.id, conversations.groupId))
        .where(eq(groups.slug, whose.group))
        .limit(1)
    : await db
        .select({ id: conversations.id })
        .from(conversations)
        .innerJoin(teams, eq(teams.id, conversations.teamId))
        .where(eq(teams.slug, whose.team!))
        .limit(1);

  if (held) return held.id;

  const [whom] = whose.group
    ? await db.select({ id: groups.id }).from(groups).where(eq(groups.slug, whose.group)).limit(1)
    : await db.select({ id: teams.id }).from(teams).where(eq(teams.slug, whose.team!)).limit(1);
  if (!whom) throw new InvalidInputError("inbox.error.thread");

  const [made] = await db
    .insert(conversations)
    .values({
      tenantId: reader.tenantId,
      kind: whose.group ? "group" : "team",
      ...(whose.group ? { groupId: whom.id } : { teamId: whom.id }),
    })
    .returning({ id: conversations.id });

  return made!.id;
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
  const me = reader.memberId ?? null;
  const [kind, name] = key.includes("/") ? key.split("/") : [null, key];

  const rows = (await db.execute(sql`
    select c.id, c.kind, c.last_message_at, c.archived_at,
           coalesce(p.office, false) as i_am_office
      from conversations c
      left join conversation_people p on p.conversation_id = c.id
       and ((p.office and ${reader.office}) or (p.member_id = ${me}))
     where ${kind === "group"
        ? sql`c.group_id = (select g.id from groups g where g.slug = ${name!} limit 1)
              and (${reader.office} or exists (select 1 from group_memberships gm
                           where gm.group_id = c.group_id and gm.member_id = ${me}))`
        : kind === "team"
          ? sql`c.team_id = (select tm.id from teams tm where tm.slug = ${name!} limit 1)
                and (${reader.office} or exists (select 1 from team_members t
                             where t.team_id = c.team_id and t.member_id = ${me}))`
          : key === "office"
            ? sql`p.id is not null and exists (select 1 from conversation_people q
                                                where q.conversation_id = c.id and q.office)`
            : sql`p.id is not null and exists (select 1 from conversation_people q
                                                 join members w on w.id = q.member_id
                                                where q.conversation_id = c.id and w.slug = ${key})`}
     order by p.office desc nulls last, c.last_message_at desc
     limit 1
  `)) as unknown as {
    id: string; kind: string; last_message_at: string | Date;
    archived_at: Date | null; i_am_office: boolean;
  }[];

  const row = rows[0];
  if (!row) return null;

  const named = kind === "group"
    ? (await db.select({ name: groups.name }).from(groups).where(eq(groups.slug, name!)).limit(1))[0]
    : kind === "team"
      ? (await db.select({ name: teams.name }).from(teams).where(eq(teams.slug, name!)).limit(1))[0]
      : null;

  const [other] = kind || key === "office"
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
    withName: named?.name ?? (other ? `${other.first} ${other.last}`.trim() : ""),
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
  const now = new Date();

  /* The office row where this reader answers for the church and the thread
     has one; otherwise their own. */
  const [held] = await db
    .select({ id: conversationPeople.id, office: conversationPeople.office })
    .from(conversationPeople)
    .where(and(
      eq(conversationPeople.conversationId, conversationId),
      reader.office && reader.memberId
        ? sql`(${conversationPeople.office}
               or ${conversationPeople.memberId} = ${reader.memberId})`
        : reader.office
          ? eq(conversationPeople.office, true)
          : eq(conversationPeople.memberId, reader.memberId ?? ""),
    ))
    .orderBy(desc(conversationPeople.office))
    .limit(1);

  if (held) {
    await db
      .update(conversationPeople)
      .set({ lastReadAt: now })
      .where(eq(conversationPeople.id, held.id));
    return;
  }

  /* R9.7. In a group thread nobody is written down until they read it, so
     the mark brings the row with it. */
  if (!reader.memberId) return;
  await db
    .insert(conversationPeople)
    .values({
      tenantId: reader.tenantId,
      conversationId,
      memberId: reader.memberId,
      office: false,
      lastReadAt: now,
    })
    .onConflictDoNothing();
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

  /* R9.7. The groups and teams themselves, which reach everybody in them. */
  const myGroups = await db
    .select({ name: groups.name, slug: groups.slug })
    .from(groupMemberships)
    .innerJoin(groups, eq(groups.id, groupMemberships.groupId))
    .where(and(
      eq(groupMemberships.memberId, reader.memberId),
      isNull(groups.archivedAt),
    ));

  const myServing = await db
    .select({ name: teams.name, slug: teams.slug })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(and(
      eq(teamMembers.memberId, reader.memberId),
      isNull(teams.archivedAt),
    ));

  const out: Recipient[] = [
    ...myGroups.map((one) => ({
      value: `group/${one.slug}`,
      name: one.name,
      photoKey: null,
      through: null,
      whole: true,
    })),
    ...myServing.map((one) => ({
      value: `team/${one.slug}`,
      name: one.name,
      photoKey: null,
      through: null,
      whole: true,
    })),
  ];

  for (const one of [...groupLeaders, ...teamLeaders]) {
    if (out.some((held) => held.value === one.slug)) continue;
    out.push({
      value: one.slug,
      name: `${one.first} ${one.last}`.trim(),
      photoKey: one.photoKey,
      through: one.through,
    });
  }
  out.sort((a, b) =>
    Number(Boolean(b.whole)) - Number(Boolean(a.whole)) || a.name.localeCompare(b.name));
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

/**
 * R16.9. The groups this reader may write to.
 *
 * The office reaches any of them, because it speaks for the church. Everybody
 * else reaches the ones they are in.
 */
export async function writableGroups(db: Tx, reader: Reader): Promise<Recipient[]> {
  const rows = reader.office
    ? await db
        .select({ name: groups.name, slug: groups.slug })
        .from(groups)
        .where(isNull(groups.archivedAt))
        .orderBy(asc(groups.name))
    : reader.memberId
      ? await db
          .select({ name: groups.name, slug: groups.slug })
          .from(groupMemberships)
          .innerJoin(groups, eq(groups.id, groupMemberships.groupId))
          .where(and(
            eq(groupMemberships.memberId, reader.memberId),
            isNull(groups.archivedAt),
          ))
          .orderBy(asc(groups.name))
      : [];

  return rows.map((one) => ({
    value: `group/${one.slug}`, name: one.name, photoKey: null, through: null, whole: true,
  }));
}

/** R16.9, R10.1. The teams this reader may write to. */
export async function writableTeams(db: Tx, reader: Reader): Promise<Recipient[]> {
  const rows = reader.office
    ? await db
        .select({ name: teams.name, slug: teams.slug })
        .from(teams)
        .where(isNull(teams.archivedAt))
        .orderBy(asc(teams.name))
    : reader.memberId
      ? await db
          .select({ name: teams.name, slug: teams.slug })
          .from(teamMembers)
          .innerJoin(teams, eq(teams.id, teamMembers.teamId))
          .where(and(
            eq(teamMembers.memberId, reader.memberId),
            isNull(teams.archivedAt),
          ))
          .orderBy(asc(teams.name))
      : [];

  return rows.map((one) => ({
    value: `team/${one.slug}`, name: one.name, photoKey: null, through: null, whole: true,
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
      photoKey: members.photoKey,
      groupName: groups.name,
      teamName: teams.name,
    })
    .from(messageDrafts)
    .leftJoin(members, sql`${members.id}::text = ${messageDrafts.target}`)
    .leftJoin(groups, sql`'group/' || ${groups.slug} = ${messageDrafts.target}`)
    .leftJoin(teams, sql`'team/' || ${teams.slug} = ${messageDrafts.target}`)
    .where(eq(messageDrafts.userId, reader.userId));

  return rows
    .filter((one) => one.body.trim().length > 0)
    .map((one) => ({
      target: one.target === "office" || one.target.includes("/")
        ? one.target
        : one.slug ?? one.target,
      photoKey: one.photoKey ?? null,
      name: one.target === "office"
        ? ""
        : one.target.includes("/")
          ? (one.groupName ?? one.teamName ?? "")
          : `${one.first ?? ""} ${one.last ?? ""}`.trim(),
      body: one.body,
      updatedAt: one.updatedAt,
    }))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/** R16.9. A draft, kept as it is typed. */
export async function saveDraft(
  db: Tx,
  reader: Reader,
  /** "office", a group or team address, or whoever it is addressed to. */
  key: string,
  body: string,
): Promise<void> {
  const target = key === "office" || key.includes("/")
    ? key
    : (await memberBySlug(db, key)) ?? key;
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
