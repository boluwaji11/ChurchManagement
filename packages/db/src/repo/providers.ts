import { and, desc, eq, ne } from "drizzle-orm";
import type { Tx } from "../client";
import { churchProviders, churchSendingDomains } from "../schema/messaging";
import { PermissionError } from "../roles";
import { canManageChurch } from "./church";
import { sealCredential, openCredential, CREDENTIAL_KEY_ID } from "../crypto";
import type { PlannedRecord } from "../domain/preflight";
import type { WriteActor } from "./members";
import type { Vendor } from "../messaging/contract";

/**
 * HRT-287, R16.1, R21.15. A church's own email account, as this product holds it.
 *
 * The church owns the account and pays the bill. Two ways in: the mail server
 * it already has, which needs no new vendor and no change to its domain, or
 * Resend, which needs both and sends more than a day's worth.
 *
 * The credential is sealed before it reaches the column and **no function in
 * this file selects it**. That is the field-level rule rather than a habit: a
 * screen that forgets to hide a church's mail password must still never be
 * handed one. It is opened in the worker that sends, and the connect path
 * never needs to, because the plaintext is in hand from the form at the moment
 * the connection is proved.
 */

/** HRT-287. A church's own mail server, as its host wrote it down. */
export interface SmtpSettings {
  host: string;
  port: number;
  /** Whether the session starts encrypted, which port 465 does and 587 does not. */
  secure: boolean;
  username: string;
}

export interface EmailProvider {
  id: string;
  vendor: Vendor;
  /** "connected" or "disconnected". */
  state: string;
  /** What the vendor calls this account. Safe to show. */
  externalAccountId: string | null;
  fromName: string | null;
  fromAddress: string | null;
  /** The mail server's details for `smtp`, and empty for Resend. */
  settings: SmtpSettings | null;
  connectedAt: Date | null;
  lastVerifiedAt: Date | null;
  lastError: string | null;
}

const asSmtp = (raw: unknown): SmtpSettings | null => {
  if (typeof raw !== "object" || raw === null) return null;
  const held = raw as Record<string, unknown>;
  if (typeof held.host !== "string" || !held.host) return null;
  return {
    host: held.host,
    port: typeof held.port === "number" ? held.port : 587,
    secure: held.secure === true,
    username: typeof held.username === "string" ? held.username : "",
  };
};

/** R16.1. What this church sends email through, if anything. */
export async function emailProvider(db: Tx): Promise<EmailProvider | null> {
  const [row] = await db
    .select({
      id: churchProviders.id,
      vendor: churchProviders.vendor,
      state: churchProviders.state,
      externalAccountId: churchProviders.externalAccountId,
      fromName: churchProviders.fromName,
      fromAddress: churchProviders.fromAddress,
      settings: churchProviders.settings,
      connectedAt: churchProviders.connectedAt,
      lastVerifiedAt: churchProviders.lastVerifiedAt,
      lastError: churchProviders.lastError,
    })
    .from(churchProviders)
    .where(and(eq(churchProviders.channel, "email"), eq(churchProviders.state, "connected")))
    .limit(1);

  if (!row) return null;
  return { ...row, vendor: row.vendor as Vendor, settings: asSmtp(row.settings) };
}

export interface ConnectEmail {
  vendor: Extract<Vendor, "resend" | "smtp">;
  /** The secret, in plaintext. Sealed here and never read back out. */
  credential: string;
  /** What the vendor calls the account: a Resend team id, or the mail user. */
  externalAccountId: string | null;
  fromName: string;
  fromAddress: string;
  settings: SmtpSettings | null;
}

/**
 * HRT-387, R16.1. How long Resend gives a refresh token, in days.
 *
 * Every exchange resets it. The worker refreshes a quiet church's grant
 * before the end rather than letting it lapse, because a lapsed grant cannot
 * be recovered from this side: the church has to connect Resend again.
 */
export const GRANT_DAYS = 60;

/**
 * R16.1, R21.15. Writing down a connection that has already been proved.
 *
 * Proved first, written second. The caller talks to the mail server or to
 * Resend with the plaintext in hand, and only a connection that answered gets
 * this far, so a church never ends up with a saved account that cannot send.
 *
 * A church sends through one thing at a time, so connecting the second way
 * disconnects the first. The old row stays, because a church that comes back
 * to its own mail server should find the host and the username it typed in
 * rather than a blank form.
 */
export async function connectEmailProvider(
  db: Tx,
  actor: WriteActor,
  input: ConnectEmail,
): Promise<string> {
  if (!canManageChurch(actor)) throw new PermissionError(actor.role, "editChurch");

  const now = new Date();
  const row = {
    state: "connected",
    externalAccountId: input.externalAccountId,
    credential: sealCredential(input.credential),
    credentialKeyId: CREDENTIAL_KEY_ID,
    fromName: input.fromName,
    fromAddress: input.fromAddress,
    settings: input.settings ?? {},
    /*
     * HRT-387, R16.1. Resend's refresh token lasts sixty days and every
     * exchange resets them, so the clock starts here. A church's own mail
     * server has no expiry, and its password is good until it changes it.
     */
    credentialExpiresAt:
      input.vendor === "resend"
        ? new Date(now.getTime() + GRANT_DAYS * 86_400_000)
        : null,
    connectedAt: now,
    connectedBy: actor.userId ?? null,
    lastVerifiedAt: now,
    lastError: null,
    updatedAt: now,
  };

  const [existing] = await db
    .select({ id: churchProviders.id })
    .from(churchProviders)
    .where(and(eq(churchProviders.channel, "email"), eq(churchProviders.vendor, input.vendor)))
    .limit(1);

  const id = existing
    ? (await db
        .update(churchProviders)
        .set(row)
        .where(eq(churchProviders.id, existing.id))
        .returning({ id: churchProviders.id }))[0]!.id
    : (await db
        .insert(churchProviders)
        .values({ tenantId: actor.tenantId, channel: "email", vendor: input.vendor, ...row })
        .returning({ id: churchProviders.id }))[0]!.id;

  await db
    .update(churchProviders)
    .set({ state: "disconnected", updatedAt: now })
    .where(and(eq(churchProviders.channel, "email"), ne(churchProviders.id, id)));

  return id;
}

/**
 * R16.1, R21.15. Taking the connection off, and handing the grant back.
 *
 * The credential comes out of the column and is handed to the caller in the
 * same breath, because the one thing left to do with it is give it back: a
 * church that disconnected Resend has withdrawn its consent, and forgetting
 * our copy while a live grant sits on its account is not the same as
 * withdrawing it. There is no function here that reads a credential and
 * leaves it in place, so a screen cannot ask for one.
 *
 * The row is kept, because a church reconnecting the same account should not
 * read as a new one.
 */
export async function withdrawEmailProvider(
  db: Tx,
  actor: WriteActor,
): Promise<{ vendor: Vendor; credential: string } | null> {
  if (!canManageChurch(actor)) throw new PermissionError(actor.role, "editChurch");

  /* Read and clear in one transaction, so there is no moment where the
     credential has been handed out and is still in the column. */
  const [row] = await db
    .select({
      id: churchProviders.id,
      vendor: churchProviders.vendor,
      credential: churchProviders.credential,
    })
    .from(churchProviders)
    .where(eq(churchProviders.channel, "email"))
    .limit(1);

  if (!row) return null;

  await db
    .update(churchProviders)
    .set({
      state: "disconnected",
      credential: null,
      credentialKeyId: null,
      lastVerifiedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(churchProviders.id, row.id));

  return {
    vendor: row.vendor as Vendor,
    credential: row.credential ? openCredential(row.credential) : "",
  };
}

/**
 * HRT-290, R16.1, R21.15. The credential, for the one thing it is for.
 *
 * Named for sending rather than for reading, because reading is not a thing
 * anybody should be able to ask for. A screen that wants to show a church its
 * own password has no business doing so, and there is no function here that
 * would let it: this one is for the code that is about to send, and the only
 * caller is the send itself.
 */
export interface SendingAccount {
  providerId: string;
  vendor: Vendor;
  credential: string;
  fromName: string | null;
  fromAddress: string | null;
  settings: SmtpSettings | null;
  /**
   * HRT-290, R16.1. The short-lived token, while it still has minutes on it.
   *
   * Null means it has to be refreshed, and refreshing rotates the credential
   * above: Resend issues a new refresh token every time, refuses a spent one
   * and revokes the whole grant when one is replayed. So this is read before
   * a send rather than refreshed on every send, and the pair is written back
   * together through `storeTokens`.
   */
  access: string | null;
}

export async function emailCredentialForSend(
  db: Tx,
  actor: WriteActor,
): Promise<SendingAccount | null> {
  if (!canManageChurch(actor)) throw new PermissionError(actor.role, "editChurch");

  const [row] = await db
    .select({
      id: churchProviders.id,
      vendor: churchProviders.vendor,
      credential: churchProviders.credential,
      fromName: churchProviders.fromName,
      fromAddress: churchProviders.fromAddress,
      settings: churchProviders.settings,
      access: churchProviders.accessToken,
      accessExpires: churchProviders.accessExpires,
    })
    .from(churchProviders)
    .where(and(eq(churchProviders.channel, "email"), eq(churchProviders.state, "connected")))
    .limit(1);

  if (!row?.credential) return null;

  /* A minute's grace, so a token that expires between this read and the send
     is refreshed first rather than refused halfway through. The same window
     the worker uses. */
  const good =
    row.access !== null
    && row.accessExpires !== null
    && row.accessExpires.getTime() > Date.now() + 60_000;

  return {
    providerId: row.id,
    vendor: row.vendor as Vendor,
    credential: openCredential(row.credential),
    fromName: row.fromName,
    fromAddress: row.fromAddress,
    settings: asSmtp(row.settings),
    access: good ? openCredential(row.access!) : null,
  };
}


/** R16.1. What the provider said when it last refused, kept for the screen. */
export async function markEmailTrouble(
  db: Tx,
  actor: WriteActor,
  input: { providerId: string; said: string | null },
): Promise<void> {
  if (!canManageChurch(actor)) throw new PermissionError(actor.role, "editChurch");

  await db
    .update(churchProviders)
    .set({ lastError: input.said, updatedAt: new Date() })
    .where(eq(churchProviders.id, input.providerId));
}

/** R16.1. A domain a church sends from, and how far its records have got. */
export interface SendingDomain {
  id: string;
  domain: string;
  /** "pending", "verified" or "failed". */
  state: string;
  records: PlannedRecord[];
  checkedAt: Date | null;
  verifiedAt: Date | null;
  failureReason: string | null;
}

export async function sendingDomain(
  db: Tx,
  /**
   * R16.1. The provider this is the domain for.
   *
   * A church that connects, disconnects and connects again with a different
   * address leaves a row behind for each, and a read of "one of them" is a
   * read of whichever Postgres hands back first. A church that had verified
   * connectapp.church and then connected onefamilychurch.com was shown the
   * old row, told it was ready to send, and met the refusal on the first
   * message. Without an id this still answers, newest first, so a caller that
   * has no provider in its hand gets the current one rather than the oldest.
   */
  providerId?: string | null,
): Promise<SendingDomain | null> {
  const [row] = await db
    .select({
      id: churchSendingDomains.id,
      domain: churchSendingDomains.domain,
      state: churchSendingDomains.state,
      records: churchSendingDomains.records,
      checkedAt: churchSendingDomains.checkedAt,
      verifiedAt: churchSendingDomains.verifiedAt,
      failureReason: churchSendingDomains.failureReason,
    })
    .from(churchSendingDomains)
    .where(providerId ? eq(churchSendingDomains.providerId, providerId) : undefined)
    .orderBy(desc(churchSendingDomains.updatedAt))
    .limit(1);

  if (!row) return null;
  return { ...row, records: (row.records as PlannedRecord[]) ?? [] };
}

/**
 * R16.1. The records the provider generated, kept so the screen can show them again.
 *
 * A volunteer opens their registrar in another tab, types one record, gets
 * interrupted, and comes back an hour later. The screen they come back to has
 * to be the same screen, which means the values live here rather than in the
 * response that produced them.
 */
export async function saveSendingDomain(
  db: Tx,
  actor: WriteActor,
  input: { providerId: string; domain: string; records: PlannedRecord[] },
): Promise<void> {
  if (!canManageChurch(actor)) throw new PermissionError(actor.role, "editChurch");

  const [existing] = await db
    .select({ id: churchSendingDomains.id })
    .from(churchSendingDomains)
    .where(eq(churchSendingDomains.domain, input.domain))
    .limit(1);

  if (existing) {
    await db
      .update(churchSendingDomains)
      .set({ providerId: input.providerId, records: input.records, updatedAt: new Date() })
      .where(eq(churchSendingDomains.id, existing.id));
    return;
  }

  await db.insert(churchSendingDomains).values({
    tenantId: actor.tenantId,
    providerId: input.providerId,
    domain: input.domain,
    records: input.records,
  });
}

/** R16.1. What the last look at public DNS found. */
export async function markSendingDomain(
  db: Tx,
  actor: WriteActor,
  input: { id: string; state: "pending" | "verified" | "failed"; failureReason: string | null },
): Promise<void> {
  if (!canManageChurch(actor)) throw new PermissionError(actor.role, "editChurch");

  const now = new Date();
  await db
    .update(churchSendingDomains)
    .set({
      state: input.state,
      checkedAt: now,
      verifiedAt: input.state === "verified" ? now : null,
      failureReason: input.failureReason,
      updatedAt: now,
    })
    .where(eq(churchSendingDomains.id, input.id));
}
