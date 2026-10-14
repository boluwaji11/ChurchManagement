import { randomBytes } from "node:crypto";
import { and, desc, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { owner, type Tx } from "../client";
import { emailSends, emailRecipients, contactConsent } from "../schema/messaging";
import { tenants } from "../schema/tenancy";
import { members } from "../schema/members";
import { groupMemberships } from "../schema/groups";
import { PermissionError } from "../roles";
import { canManageChurch } from "./church";
import { resolveList } from "./lists";
import { listPeople, type WriteActor } from "./members";

/**
 * HRT-139, HRT-143, R16.4, R16.6, R16.8. A message a church sends to its people.
 *
 * Who it goes to is worked out here rather than on the screen, because the one
 * rule that must never be forgotten lives here: anybody who has asked to be
 * left alone comes off every list, whichever way the list was chosen.
 */

/** Who a send is for. */
export type Audience = "everyone" | "list" | "group" | "people";

export interface EmailRecipient {
  /** Null for an address typed in that belongs to nobody on the list. */
  memberId: string | null;
  address: string;
  first: string;
  name: string;
  /** R16.8. The way out, which this person's own messages carry. */
  token: string;
}

/**
 * R16.8. The people this send would actually reach.
 *
 * Three filters, in this order: they are in the audience, they have an
 * address, and they have not asked to be left alone. The last one is applied
 * here and nowhere else, so a new way of choosing an audience cannot
 * accidentally skip it.
 */
export async function emailRecipientsFor(
  db: Tx,
  input: {
    audience: Audience;
    audienceId?: string | null;
    memberIds?: readonly string[];
    /** R16.8. Addresses typed in, belonging to nobody on the list. */
    addresses?: readonly string[];
  },
): Promise<EmailRecipient[]> {
  /* Everybody this church keeps, read once. The audience narrows it rather
     than fetching a second time, so one rule decides who is reachable. */
  const people = await listPeople(db, { sort: "name" });

  const wanted = await (async () => {
    if (input.audience === "people") return new Set(input.memberIds ?? []);

    if (input.audience === "group" && input.audienceId) {
      const rows = await db
        .select({ memberId: groupMemberships.memberId })
        .from(groupMemberships)
        .where(
          and(
            eq(groupMemberships.groupId, input.audienceId),
            isNull(groupMemberships.leftOn),
          ),
        );
      return new Set(rows.map((one) => one.memberId));
    }

    if (input.audience === "list" && input.audienceId) {
      const held = await resolveList(db, input.audienceId);
      if (!held) return new Set<string>();
      if (held.kind === "static") return new Set(held.ids ?? []);
      const narrowed = await listPeople(db, { ...(held.rule ?? {}) } as never);
      return new Set(narrowed.map((one) => one.id));
    }

    return null;
  })();

  /* An audience of nobody is nobody, unless addresses were typed in: those
     belong to no member and would otherwise be dropped before they are read. */
  if (wanted !== null && wanted.size === 0 && (input.addresses ?? []).length === 0) return [];

  /* R16.8. Who has asked to be left alone, read once rather than a query a
     person. Anything other than withdrawn may be written to: a church mailing
     its own congregation is not cold outreach, and silence is not a refusal. */
  const out = await db
    .select({ memberId: contactConsent.memberId, address: contactConsent.address })
    .from(contactConsent)
    .where(and(eq(contactConsent.channel, "email"), eq(contactConsent.state, "withdrawn")));

  const refused = new Set(out.map((one) => one.memberId).filter(Boolean));
  const refusedAddresses = new Set(
    out.map((one) => one.address?.trim().toLowerCase()).filter(Boolean),
  );

  const found: EmailRecipient[] = [];
  for (const row of people) {
    if (wanted !== null && !wanted.has(row.id)) continue;
    if (row.archivedAt !== null) continue;

    const address = row.primaryEmail?.trim();
    if (!address) continue;
    if (refused.has(row.id)) continue;

    if (refusedAddresses.has(address.toLowerCase())) continue;

    found.push({
      memberId: row.id,
      address,
      first: row.preferredName?.trim() || row.firstName,
      name: row.displayName,
      token: "",
    });
  }

  /* R16.8. Addresses typed in rather than chosen. Nobody on the list has
     them, so there is no name to greet them by: the mark falls back to the
     address, which is what a church would have written anyway. */
  const already = new Set(found.map((one) => one.address.toLowerCase()));
  for (const raw of input.addresses ?? []) {
    const address = raw.trim().toLowerCase();
    if (!address || already.has(address) || refusedAddresses.has(address)) continue;
    already.add(address);
    found.push({ memberId: null, address, first: address, name: address, token: "" });
  }
  return found;
}

/**
 * R16.4. People to send to, by the name whoever is writing knows them by.
 *
 * Only those with an address, because offering somebody who cannot be emailed
 * is offering a choice that quietly does nothing.
 */
export interface Candidate {
  id: string;
  name: string;
  address: string;
}

export async function findEmailRecipients(
  db: Tx,
  query: string,
  limit = 8,
): Promise<Candidate[]> {
  const text = query.trim().toLowerCase();
  const people = await listPeople(db, { sort: "name" });

  const out: Candidate[] = [];
  for (const row of people) {
    if (row.archivedAt !== null) continue;
    const address = row.primaryEmail?.trim();
    if (!address) continue;

    const haystack = `${row.displayName} ${row.firstName} ${row.lastName} ${address}`.toLowerCase();
    if (text && !haystack.includes(text)) continue;

    out.push({ id: row.id, name: row.displayName, address });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * R16.8. The address that takes somebody off every later send.
 *
 * Minted once a person and kept, so the link in a message sent last year still
 * works. A consent row is written at the same time, because the row is what
 * every send reads and a token with no row behind it would unsubscribe nobody.
 */
export async function wayOutFor(
  db: Tx,
  actor: WriteActor,
  who: { memberId: string | null; address: string },
): Promise<string> {
  const mine = who.memberId
    ? eq(contactConsent.memberId, who.memberId)
    : eq(contactConsent.address, who.address.trim().toLowerCase());

  const [held] = await db
    .select({ id: contactConsent.id, token: contactConsent.token })
    .from(contactConsent)
    .where(and(mine, eq(contactConsent.channel, "email")))
    .limit(1);

  if (held?.token) return held.token;

  const token = randomBytes(24).toString("base64url");

  if (held) {
    await db
      .update(contactConsent)
      .set({ token, updatedAt: new Date() })
      .where(eq(contactConsent.id, held.id));
    return token;
  }

  await db.insert(contactConsent).values({
    tenantId: actor.tenantId,
    memberId: who.memberId,
    address: who.memberId ? null : who.address.trim().toLowerCase(),
    channel: "email",
    state: "unknown",
    token,
  });
  return token;
}

/**
 * R16.8. Somebody asking to be left alone, from the link in a message.
 *
 * No session: whoever holds the token is the person the token was minted for,
 * and asking somebody to sign in before they can get out of a mailing list is
 * how a church gets reported as spam instead.
 */
export interface WayOut {
  tenantId: string;
  churchName: string;
  /** R17.1. The church's own mark, so the screen is plainly theirs. */
  logoKey: string | null;
  /** Who was taken off, said back to them, because a link carries no name. */
  address: string | null;
}

export async function withdrawByToken(token: string): Promise<WayOut | null> {
  if (!token || token.length < 16) return null;

  /*
   * R16.8. Read and written as the owner, because whoever followed this link
   * is signed in to nothing and the token is the only thing that says which
   * church it belongs to. It touches one row, found by that token, and
   * nothing else is reachable from here.
   */
  const db = drizzle(owner());

  const row = await holder(db, token);
  if (!row) return null;

  await db
    .update(contactConsent)
    .set({
      state: "withdrawn",
      source: "portal",
      withdrawnAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(contactConsent.id, row.id));

  return said(db, row);
}

/**
 * R16.8. Back on the list, for somebody who pressed it by mistake.
 *
 * The same token, because somebody who has just unsubscribed by accident has
 * the screen in front of them and nothing else to prove who they are. It puts
 * them back where they were before the press rather than recording a consent
 * the church never collected.
 */
export async function restoreByToken(token: string): Promise<WayOut | null> {
  if (!token || token.length < 16) return null;

  const db = drizzle(owner());
  const row = await holder(db, token);
  if (!row) return null;

  await db
    .update(contactConsent)
    .set({ state: "unknown", withdrawnAt: null, updatedAt: new Date() })
    .where(eq(contactConsent.id, row.id));

  return said(db, row);
}

interface Holder {
  id: string;
  tenantId: string;
  address: string | null;
  memberId: string | null;
}

async function holder(db: ReturnType<typeof drizzle>, token: string): Promise<Holder | null> {
  const [row] = await db
    .select({
      id: contactConsent.id,
      tenantId: contactConsent.tenantId,
      address: contactConsent.address,
      memberId: contactConsent.memberId,
    })
    .from(contactConsent)
    .where(eq(contactConsent.token, token))
    .limit(1);

  return row ?? null;
}

/** The church this token belongs to, as the person reading it would know it. */
async function said(db: ReturnType<typeof drizzle>, row: Holder): Promise<WayOut> {
  const [church] = await db
    .select({ name: tenants.name, logoKey: tenants.logoKey })
    .from(tenants)
    .where(eq(tenants.id, row.tenantId))
    .limit(1);

  /* A member's address lives on their record rather than on the consent row,
     which holds one only for somebody the church is not keeping. */
  let address = row.address;
  if (!address && row.memberId) {
    const [person] = await db
      .select({
        email: sql<string | null>`(
          select cm.value from contact_methods cm
          where cm.member_id = ${members.id} and cm.kind = 'email' and cm.is_primary
          limit 1
        )`,
      })
      .from(members)
      .where(eq(members.id, row.memberId))
      .limit(1);
    address = person?.email ?? null;
  }

  return {
    tenantId: row.tenantId,
    churchName: church?.name ?? "",
    logoKey: church?.logoKey ?? null,
    address,
  };
}

/** R16.6. The send itself, written down before a single message goes. */
export async function startSend(
  db: Tx,
  actor: WriteActor,
  input: {
    subject: string;
    body: string;
    audience: Audience;
    audienceId: string | null;
    audienceName: string | null;
    total: number;
  },
): Promise<string> {
  if (!canManageChurch(actor)) throw new PermissionError(actor.role, "editChurch");

  const [row] = await db
    .insert(emailSends)
    .values({
      tenantId: actor.tenantId,
      subject: input.subject,
      body: input.body,
      audience: input.audience,
      audienceId: input.audienceId,
      audienceName: input.audienceName,
      state: "sending",
      total: input.total,
      sentBy: actor.userId ?? null,
      sentAt: new Date(),
    })
    .returning({ id: emailSends.id });

  return row!.id;
}

/** R16.6, R16.7. What happened to one person's copy. */
export async function recordDelivery(
  db: Tx,
  actor: WriteActor,
  input: {
    sendId: string;
    memberId: string | null;
    address: string;
    ok: boolean;
    said: string | null;
  },
): Promise<void> {
  await db.insert(emailRecipients).values({
    tenantId: actor.tenantId,
    sendId: input.sendId,
    memberId: input.memberId,
    address: input.address,
    state: input.ok ? "sent" : "failed",
    said: input.said,
  });
}

/** R16.6. The tally, once every copy has been attempted. */
export async function finishSend(
  db: Tx,
  actor: WriteActor,
  sendId: string,
): Promise<{ delivered: number; failed: number }> {
  if (!canManageChurch(actor)) throw new PermissionError(actor.role, "editChurch");

  const [tally] = await db
    .select({
      delivered: sql<number>`count(*) filter (where ${emailRecipients.state} = 'sent')::int`,
      failed: sql<number>`count(*) filter (where ${emailRecipients.state} = 'failed')::int`,
    })
    .from(emailRecipients)
    .where(eq(emailRecipients.sendId, sendId));

  const delivered = tally?.delivered ?? 0;
  const failed = tally?.failed ?? 0;

  await db
    .update(emailSends)
    .set({
      state: delivered > 0 ? "sent" : "failed",
      delivered,
      failed,
      updatedAt: new Date(),
    })
    .where(eq(emailSends.id, sendId));

  return { delivered, failed };
}

export interface SentEmail {
  id: string;
  subject: string;
  audienceName: string | null;
  audience: string;
  state: string;
  total: number;
  delivered: number;
  failed: number;
  sentAt: Date | null;
}

/** R16.6. What this church has sent, newest first. */
export async function listSends(db: Tx, limit = 20): Promise<SentEmail[]> {
  return db
    .select({
      id: emailSends.id,
      subject: emailSends.subject,
      audienceName: emailSends.audienceName,
      audience: emailSends.audience,
      state: emailSends.state,
      total: emailSends.total,
      delivered: emailSends.delivered,
      failed: emailSends.failed,
      sentAt: emailSends.sentAt,
    })
    .from(emailSends)
    .where(ne(emailSends.state, "draft"))
    .orderBy(desc(emailSends.sentAt))
    .limit(limit);
}

/** R16.8. How many of this church's people have asked to be left alone. */
export async function countWithdrawn(db: Tx): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(contactConsent)
    .where(
      and(
        eq(contactConsent.channel, "email"),
        eq(contactConsent.state, "withdrawn"),
        isNotNull(contactConsent.memberId),
      ),
    );
  return row?.n ?? 0;
}

export interface SentEmailDetail extends SentEmail {
  body: string;
  /** Every address it was attempted to, and what came back from the ones that refused. */
  recipients: { address: string; state: string; said: string | null }[];
}

/**
 * R16.6. One message as it went, read back.
 *
 * A church asked who got the carol service invitation six weeks ago, and the
 * answer is the message itself and the addresses it was attempted to. Nothing
 * here can be edited: a send is what happened.
 */
export async function readSend(db: Tx, id: string): Promise<SentEmailDetail | null> {
  const [row] = await db
    .select({
      id: emailSends.id,
      subject: emailSends.subject,
      body: emailSends.body,
      audienceName: emailSends.audienceName,
      audience: emailSends.audience,
      state: emailSends.state,
      total: emailSends.total,
      delivered: emailSends.delivered,
      failed: emailSends.failed,
      sentAt: emailSends.sentAt,
    })
    .from(emailSends)
    .where(eq(emailSends.id, id))
    .limit(1);

  if (!row) return null;

  const who = await db
    .select({
      address: emailRecipients.address,
      state: emailRecipients.state,
      said: emailRecipients.said,
    })
    .from(emailRecipients)
    .where(eq(emailRecipients.sendId, id))
    .orderBy(emailRecipients.address);

  return { ...row, recipients: who };
}

export interface Withdrawn {
  id: string;
  address: string;
  /** The person's own name where there is a record behind the address. */
  name: string | null;
  withdrawnAt: Date | null;
}

/**
 * R16.8. Everybody who has asked this church to stop emailing them.
 *
 * Kept where a church can read it, because "we never sent them anything" is
 * not an answer when somebody says they were written to after asking twice.
 * Both kinds are here: people on the list, and addresses that belong to
 * nobody on it.
 */
export async function listWithdrawn(db: Tx): Promise<Withdrawn[]> {
  const rows = await db
    .select({
      id: contactConsent.id,
      address: contactConsent.address,
      memberId: contactConsent.memberId,
      withdrawnAt: contactConsent.withdrawnAt,
      name: sql<string | null>`(
        select m.display_name from members m where m.id = ${contactConsent.memberId}
      )`,
      held: sql<string | null>`(
        select cm.value from contact_methods cm
        where cm.member_id = ${contactConsent.memberId}
          and cm.kind = 'email' and cm.is_primary
        limit 1
      )`,
    })
    .from(contactConsent)
    .where(and(eq(contactConsent.channel, "email"), eq(contactConsent.state, "withdrawn")))
    .orderBy(desc(contactConsent.withdrawnAt));

  return rows
    .map((one) => ({
      id: one.id,
      address: one.address ?? one.held ?? "",
      name: one.name,
      withdrawnAt: one.withdrawnAt,
    }))
    .filter((one) => one.address !== "");
}

/**
 * R16.8. Putting somebody back, when they have asked the church directly.
 *
 * A church hears "put me back on the newsletter" in the car park far more
 * often than it hears it through a link, so the office needs the same press
 * the person has. It records nothing about consent that was not collected:
 * the row goes back to unknown, which is where everybody starts.
 */
export async function restoreConsent(db: Tx, actor: WriteActor, id: string): Promise<void> {
  if (!canManageChurch(actor)) throw new PermissionError(actor.role, "editChurch");

  await db
    .update(contactConsent)
    .set({ state: "unknown", withdrawnAt: null, updatedAt: new Date() })
    .where(eq(contactConsent.id, id));
}
