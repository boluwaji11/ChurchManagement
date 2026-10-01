import { eq } from "drizzle-orm";
import type { Tx } from "../client";
import { emailSenders } from "../schema/messaging";
import { PermissionError, type TenantRole } from "../roles";
import { InvalidInputError } from "../errors";
import { seal, unseal } from "../crypto";
import { canManageChurch } from "./church";

/**
 * R16.2. The church's own email provider.
 *
 * Hearth never resells sending. A church supplies its own Resend key or its own
 * SMTP account, mail leaves under the church's domain, and a church that sends
 * more than we would have paid for is in a conversation with its provider. This
 * is the constraint that makes a donation-funded platform survive its own
 * growth, so it is structural rather than a setting.
 *
 * The key is encrypted by the application before it is written. It is returned
 * to a screen never, and to the sender only.
 */

export const PROVIDERS = ["resend", "smtp"] as const;
export type EmailProvider = (typeof PROVIDERS)[number];

export interface EmailSender {
  provider: EmailProvider;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  host: string | null;
  port: number | null;
  username: string | null;
  /** Whether a key is on file. The key itself does not come back. */
  hasSecret: boolean;
  verifiedAt: Date | null;
  lastError: string | null;
}

export interface EmailSenderInput {
  provider: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string | null;
  host?: string | null;
  port?: number | null;
  username?: string | null;
  /** Left empty on an edit to keep the key already on file. */
  secret?: string | null;
}

/** The parts a send needs, including the key in the clear. */
export interface SenderCredentials {
  provider: EmailProvider;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  host: string | null;
  port: number | null;
  username: string | null;
  secret: string | null;
}

const trim = (value: string | null | undefined): string | null => value?.trim() || null;

/** Good enough to catch a typo. The provider decides what it will accept. */
const looksLikeEmail = (value: string): boolean => /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(value);

export async function getEmailSender(db: Tx, tenantId: string): Promise<EmailSender | null> {
  const [row] = await db
    .select()
    .from(emailSenders)
    .where(eq(emailSenders.tenantId, tenantId))
    .limit(1);
  if (!row) return null;
  return {
    provider: row.provider as EmailProvider,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    replyTo: row.replyTo,
    host: row.host,
    port: row.port,
    username: row.username,
    hasSecret: row.secret !== null,
    verifiedAt: row.verifiedAt,
    lastError: row.lastError,
  };
}

/**
 * The credentials, decrypted.
 *
 * Called by the code that sends a message and by nothing that renders a screen.
 */
export async function senderCredentials(
  db: Tx,
  tenantId: string,
): Promise<SenderCredentials | null> {
  const [row] = await db
    .select()
    .from(emailSenders)
    .where(eq(emailSenders.tenantId, tenantId))
    .limit(1);
  if (!row) return null;
  return {
    provider: row.provider as EmailProvider,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    replyTo: row.replyTo,
    host: row.host,
    port: row.port,
    username: row.username,
    secret: row.secret === null ? null : unseal(row.secret),
  };
}

function validate(input: EmailSenderInput, existing: EmailSender | null) {
  const provider = trim(input.provider) as EmailProvider | null;
  if (!provider || !PROVIDERS.includes(provider)) throw new InvalidInputError("email.error.provider");

  const fromName = trim(input.fromName);
  if (!fromName) throw new InvalidInputError("email.error.fromName");

  const fromEmail = trim(input.fromEmail)?.toLowerCase() ?? null;
  if (!fromEmail || !looksLikeEmail(fromEmail)) throw new InvalidInputError("email.error.fromEmail");

  const replyTo = trim(input.replyTo)?.toLowerCase() ?? null;
  if (replyTo && !looksLikeEmail(replyTo)) throw new InvalidInputError("email.error.replyTo");

  const secret = trim(input.secret);
  const keeping = existing?.hasSecret && existing.provider === provider;
  if (!secret && !keeping) throw new InvalidInputError("email.error.secret");

  let host: string | null = null;
  let port: number | null = null;
  let username: string | null = null;

  if (provider === "smtp") {
    host = trim(input.host);
    if (!host) throw new InvalidInputError("email.error.host");
    port = input.port ?? null;
    if (port === null || !Number.isInteger(port) || port < 1 || port > 65535) {
      throw new InvalidInputError("email.error.port");
    }
    username = trim(input.username);
    if (!username) throw new InvalidInputError("email.error.username");
  }

  return { provider, fromName, fromEmail, replyTo, secret, host, port, username };
}

/**
 * R16.2. Writing the provider down.
 *
 * Changing anything clears the verification, because a church that changes a
 * key and keeps a tick next to it has been told something untrue.
 */
export async function saveEmailSender(
  db: Tx,
  actor: { tenantId: string; role: TenantRole },
  input: EmailSenderInput,
): Promise<EmailSender> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "manageEmail");

  const existing = await getEmailSender(db, actor.tenantId);
  const clean = validate(input, existing);

  const values = {
    provider: clean.provider,
    fromName: clean.fromName,
    fromEmail: clean.fromEmail,
    replyTo: clean.replyTo,
    host: clean.host,
    port: clean.port,
    username: clean.username,
    verifiedAt: null,
    lastError: null,
    updatedAt: new Date(),
    ...(clean.secret ? { secret: seal(clean.secret) } : {}),
  };

  if (existing) {
    await db.update(emailSenders).set(values).where(eq(emailSenders.tenantId, actor.tenantId));
  } else {
    await db.insert(emailSenders).values({
      tenantId: actor.tenantId,
      ...values,
      secret: clean.secret ? seal(clean.secret) : null,
    });
  }

  return (await getEmailSender(db, actor.tenantId))!;
}

/** R16.2. What the provider said to a test message. */
export async function recordSendResult(
  db: Tx,
  tenantId: string,
  result: { ok: true } | { ok: false; error: string },
): Promise<void> {
  await db
    .update(emailSenders)
    .set(
      result.ok
        ? { verifiedAt: new Date(), lastError: null, updatedAt: new Date() }
        : { lastError: result.error.slice(0, 500), updatedAt: new Date() },
    )
    .where(eq(emailSenders.tenantId, tenantId));
}

/** R16.2. Taking the provider off, which stops the church sending anything. */
export async function forgetEmailSender(
  db: Tx,
  actor: { tenantId: string; role: TenantRole },
): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "manageEmail");
  await db.delete(emailSenders).where(eq(emailSenders.tenantId, actor.tenantId));
}
