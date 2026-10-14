import { randomBytes } from "node:crypto";
import { and, desc, eq, inArray, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { owner, type Tx } from "../client";
import { emailSends, emailRecipients, contactConsent } from "../schema/messaging";
import { tenants } from "../schema/tenancy";
import { members } from "../schema/members";
import { groupMemberships } from "../schema/groups";
import { contactMethods } from "../schema/members";
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

  /* R16.7. Addresses a provider has already said nobody is at. Read once, the
     same way the withdrawals are, because a church that keeps writing to a
     dead address is a church whose other mail starts landing in spam. */
  const dead = await db
    .select({ value: contactMethods.value })
    .from(contactMethods)
    .where(and(eq(contactMethods.kind, "email"), eq(contactMethods.isValid, false)));
  const bounced = new Set(dead.map((one) => one.value.trim().toLowerCase()));

  const found: EmailRecipient[] = [];
  for (const row of people) {
    if (wanted !== null && !wanted.has(row.id)) continue;
    if (row.archivedAt !== null) continue;

    const address = row.primaryEmail?.trim();
    if (!address) continue;
    if (refused.has(row.id)) continue;

    if (refusedAddresses.has(address.toLowerCase())) continue;
    if (bounced.has(address.toLowerCase())) continue;

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
    if (bounced.has(address)) continue;
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
 * R16.8. The address that takes somebody off every later send, for a whole
 * audience at once.
 *
 * Minted once a person and kept, so the link in a message sent last year still
 * works. A consent row is written at the same time, because the row is what
 * every send reads and a token with no row behind it would unsubscribe nobody.
 *
 * Four statements at most, whatever the size of the audience. Minting one
 * person at a time cost a round trip each, which at 22ms put eleven seconds in
 * front of a five-hundred-member send and would not finish inside the
 * function's limit.
 *
 * The key in the returned map is `wayOutKey`'s: a member id, or the address
 * with an `@` in front where nobody is behind it.
 */
export async function wayOutForAll(
  db: Tx,
  actor: WriteActor,
  who: readonly { memberId: string | null; address: string }[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (who.length === 0) return out;

  /* One row stands for one person, so two recipients who share an address ask
     for the same token once. */
  const wanted = new Map<string, { memberId: string | null; address: string }>();
  for (const one of who) wanted.set(wayOutKey(one), one);

  const mine = [...wanted.values()];
  const byMember = mine.filter((one) => one.memberId);
  const byAddress = mine.filter((one) => !one.memberId);

  /*
   * A member's row is written and read in one statement. The conflict target
   * is the unique index, so two sends starting at once cannot mint two tokens
   * for the same person: the second one finds the first one's and keeps it.
   * `coalesce` is what keeps it, because a consent row captured by a form
   * carries no token until the first send needs one.
   */
  if (byMember.length > 0) {
    const rows = byMember.map(
      (one) => sql`(${one.memberId}::uuid, ${randomBytes(24).toString("base64url")})`,
    );
    const minted = (await db.execute(sql`
      insert into contact_consent (tenant_id, member_id, channel, state, token)
      select ${actor.tenantId}::uuid, v.member_id, 'email', 'unknown', v.token
        from (values ${sql.join(rows, sql`, `)}) as v(member_id, token)
      on conflict (tenant_id, member_id, channel) do update
        set token = coalesce(contact_consent.token, excluded.token),
            updated_at = case
              when contact_consent.token is null then now()
              else contact_consent.updated_at
            end
      returning member_id, token
    `)) as unknown as { member_id: string; token: string }[];
    for (const row of minted) out.set(row.member_id, row.token);
  }

  /*
   * An address with nobody behind it has no unique index to conflict on,
   * because the one on this table counts a null member as distinct from every
   * other null. So those are read, then the missing ones written.
   */
  if (byAddress.length > 0) {
    const addresses = byAddress.map((one) => one.address.trim().toLowerCase());

    const held = await db
      .select({ id: contactConsent.id, address: contactConsent.address, token: contactConsent.token })
      .from(contactConsent)
      .where(
        and(
          eq(contactConsent.channel, "email"),
          isNull(contactConsent.memberId),
          inArray(contactConsent.address, addresses),
        ),
      );

    const rowFor = new Map(held.map((row) => [String(row.address), row]));
    const toWrite: { tenantId: string; address: string; channel: string; state: string; token: string }[] = [];
    const toFill: { id: string; token: string }[] = [];

    for (const address of addresses) {
      const row = rowFor.get(address);
      const token = randomBytes(24).toString("base64url");
      if (!row) {
        toWrite.push({ tenantId: actor.tenantId, address, channel: "email", state: "unknown", token });
        out.set(`@${address}`, token);
        continue;
      }
      if (row.token) {
        out.set(`@${address}`, row.token);
        continue;
      }
      toFill.push({ id: row.id, token });
      out.set(`@${address}`, token);
    }

    if (toWrite.length > 0) await db.insert(contactConsent).values(toWrite);

    if (toFill.length > 0) {
      const pairs = toFill.map((one) => sql`(${one.id}::uuid, ${one.token})`);
      await db.execute(sql`
        update contact_consent as c
           set token = v.token, updated_at = now()
          from (values ${sql.join(pairs, sql`, `)}) as v(id, token)
         where c.id = v.id and c.token is null
      `);
    }
  }

  return out;
}

/** The key a recipient's token is held under: their id, or their address. */
export function wayOutKey(who: { memberId: string | null; address: string }): string {
  return who.memberId ?? `@${who.address.trim().toLowerCase()}`;
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

/**
 * HRT-141, R16.6. The send and every copy of it, written down before one goes.
 *
 * One transaction, so a church never ends up with a send that reaches some of
 * its people and has no record of the rest. What the worker takes afterwards
 * is rows that already exist, which is what lets the church close the laptop.
 */
export async function startSend(
  db: Tx,
  actor: WriteActor,
  input: {
    subject: string;
    body: string;
    audience: Audience;
    audienceId: string | null;
    audienceName: string | null;
    /** R16.6. When it should go. Null is now. */
    sendAt: Date | null;
    /** R16.8. The church's own address, so the worker's links are absolute. */
    origin: string;
    /** Everyone it is for, as the rules left them. */
    recipients: readonly { memberId: string | null; address: string }[];
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
      state: "queued",
      total: input.recipients.length,
      sendAt: input.sendAt,
      origin: input.origin,
      sentBy: actor.userId ?? null,
      sentAt: input.sendAt ?? new Date(),
    })
    .returning({ id: emailSends.id });

  const sendId = row!.id;

  if (input.recipients.length > 0) {
    await db.insert(emailRecipients).values(
      input.recipients.map((one) => ({
        tenantId: actor.tenantId,
        sendId,
        memberId: one.memberId,
        address: one.address,
        state: "queued",
      })),
    );
  }

  return sendId;
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
  /** R16.6. How many copies are done, for one still on its way. */
  done?: number;
  audienceName: string | null;
  audience: string;
  state: string;
  total: number;
  delivered: number;
  failed: number;
  sentAt: Date | null;
  /** R16.6. When it is set to go, for one that has not gone yet. */
  sendAt?: Date | null;
}

/** R16.6. What this church has sent, newest first, a page at a time. */
export async function listSends(
  db: Tx,
  input: { limit?: number; offset?: number } = {},
): Promise<SentEmail[]> {
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
      sendAt: emailSends.sendAt,
      done: sql<number>`(
        select count(*)::int from email_recipients r
        where r.send_id = ${emailSends.id} and r.state in ('sent','failed')
      )`,
    })
    .from(emailSends)
    .where(ne(emailSends.state, "draft"))
    .orderBy(desc(emailSends.sentAt))
    .limit(input.limit ?? 20)
    .offset(input.offset ?? 0);
}

/** R16.6. How many there are in all, so the pager knows where it ends. */
export async function countSends(db: Tx): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(emailSends)
    .where(ne(emailSends.state, "draft"));
  return row?.n ?? 0;
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

/** R16.8. How many rows the unsubscribed list holds, so the pager knows its end. */
export async function countAllWithdrawn(db: Tx): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(contactConsent)
    .where(and(eq(contactConsent.channel, "email"), eq(contactConsent.state, "withdrawn")));
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
      sendAt: emailSends.sendAt,
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
export async function listWithdrawn(
  db: Tx,
  input: { limit?: number; offset?: number } = {},
): Promise<Withdrawn[]> {
  const rows = await db
    .select({
      id: contactConsent.id,
      address: contactConsent.address,
      memberId: contactConsent.memberId,
      withdrawnAt: contactConsent.withdrawnAt,
      name: sql<string | null>`(
        select coalesce(m.preferred_name, m.first_name) || ' ' || m.last_name
        from members m where m.id = ${contactConsent.memberId}
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
    .orderBy(desc(contactConsent.withdrawnAt))
    .limit(input.limit ?? 20)
    .offset(input.offset ?? 0);

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

/**
 * HRT-141, R16.6. Calling off a send that has not gone.
 *
 * A church schedules the carol service invitation for Friday and on Thursday
 * the service moves. Without this the only way out is to let four hundred
 * wrong messages go and send an apology after them.
 *
 * Only what is still waiting is called off. A copy already handed to the
 * provider is gone and saying otherwise would be a lie on the screen.
 */
export async function cancelSend(db: Tx, actor: WriteActor, id: string): Promise<boolean> {
  if (!canManageChurch(actor)) throw new PermissionError(actor.role, "editChurch");

  const [row] = await db
    .select({ state: emailSends.state })
    .from(emailSends)
    .where(eq(emailSends.id, id))
    .limit(1);

  if (!row || (row.state !== "queued" && row.state !== "sending")) return false;

  await db
    .update(emailRecipients)
    .set({ state: "cancelled" })
    .where(and(eq(emailRecipients.sendId, id), eq(emailRecipients.state, "queued")));

  const [tally] = await db
    .select({
      delivered: sql<number>`count(*) filter (where ${emailRecipients.state} = 'sent')::int`,
      failed: sql<number>`count(*) filter (where ${emailRecipients.state} = 'failed')::int`,
    })
    .from(emailRecipients)
    .where(eq(emailRecipients.sendId, id));

  await db
    .update(emailSends)
    .set({
      state: "cancelled",
      delivered: tally?.delivered ?? 0,
      failed: tally?.failed ?? 0,
      updatedAt: new Date(),
    })
    .where(eq(emailSends.id, id));

  return true;
}
