import { and, eq } from "drizzle-orm";
import type { Tx } from "../client";
import { providerCredentials } from "../schema/messaging";
import { encryptSecret, decryptSecret } from "../crypto";
import { PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import { canManageChurch } from "./church";
import type { WriteActor } from "./people";

/**
 * R16.1, R21.15. The church's own mail account.
 *
 * Hearth never resells a message, so a church that wants to send more than the
 * shared transactional allowance gives us its own SMTP credentials. What is
 * held is somebody else's secret: it is encrypted before it reaches the
 * database and it is never read back out to a screen.
 *
 * Resend is deferred. Plain SMTP works against every provider a church is
 * likely to already have, including Resend's own SMTP endpoint, so it is the
 * one worth having first.
 */

export interface SmtpSettings {
  host: string;
  port: number;
  /** TLS from the first byte, which is port 465. Anything else starts plain and upgrades. */
  secure: boolean;
  username: string;
  fromEmail: string;
  fromName: string | null;
  replyTo: string | null;
}

/** What a settings screen is allowed to know. The password is not in it. */
export interface EmailProvider extends SmtpSettings {
  hasPassword: boolean;
  verifiedAt: string | null;
}

/** Everything needed to open a connection. Server side only. */
export interface SmtpConnection extends SmtpSettings {
  password: string;
}

export interface SmtpInput extends SmtpSettings {
  /** Left blank to keep the password already stored. */
  password?: string | null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function check(input: SmtpInput): SmtpSettings {
  const host = input.host?.trim();
  if (!host) throw new InvalidInputError("mail.error.host");

  const port = Number(input.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new InvalidInputError("mail.error.port");
  }

  const username = input.username?.trim();
  if (!username) throw new InvalidInputError("mail.error.username");

  const fromEmail = input.fromEmail?.trim().toLowerCase();
  if (!fromEmail || !EMAIL.test(fromEmail)) throw new InvalidInputError("mail.error.fromEmail");

  const replyTo = input.replyTo?.trim().toLowerCase() || null;
  if (replyTo && !EMAIL.test(replyTo)) throw new InvalidInputError("mail.error.replyTo");

  return {
    host,
    port,
    secure: Boolean(input.secure),
    username,
    fromEmail,
    fromName: input.fromName?.trim() || null,
    replyTo,
  };
}

async function row(db: Tx) {
  const [found] = await db
    .select()
    .from(providerCredentials)
    .where(eq(providerCredentials.kind, "smtp"))
    .limit(1);
  return found ?? null;
}

/** R16.1. What the settings screen shows. The password is never in it. */
export async function getEmailProvider(db: Tx): Promise<EmailProvider | null> {
  const found = await row(db);
  if (!found) return null;

  const settings = found.settings as SmtpSettings;
  return {
    ...settings,
    hasPassword: found.secretEncrypted !== null,
    verifiedAt: found.verifiedAt?.toISOString() ?? null,
  };
}

/**
 * R16.1. Everything needed to open a connection, including the password.
 *
 * Server side only, and never returned from a server action. The one caller is
 * whatever is about to send something.
 */
export async function emailConnection(db: Tx): Promise<SmtpConnection | null> {
  const found = await row(db);
  if (!found?.secretEncrypted) return null;

  return {
    ...(found.settings as SmtpSettings),
    password: decryptSecret(found.secretEncrypted),
  };
}

/**
 * R16.1. Reads what is on screen, with the password already stored where the
 * form left it blank, so a connection can be tested before anything is saved.
 */
export async function proposedConnection(
  db: Tx,
  actor: WriteActor,
  input: SmtpInput,
): Promise<SmtpConnection> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "manageMessaging");
  const settings = check(input);

  const typed = input.password?.trim();
  if (typed) return { ...settings, password: typed };

  const found = await row(db);
  if (!found?.secretEncrypted) throw new InvalidInputError("mail.error.password");
  return { ...settings, password: decryptSecret(found.secretEncrypted) };
}

/**
 * R16.1. Saves the account, with the time it last proved it works.
 *
 * Called only once a test message has gone out, so a church never leaves this
 * screen believing mail is configured when it is not.
 */
export async function saveEmailProvider(
  db: Tx,
  actor: WriteActor,
  input: SmtpInput,
): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "manageMessaging");
  const settings = check(input);

  const typed = input.password?.trim();
  const found = await row(db);
  if (!typed && !found?.secretEncrypted) throw new InvalidInputError("mail.error.password");

  const now = new Date();
  const secret = typed ? encryptSecret(typed) : found!.secretEncrypted;

  if (found) {
    await db
      .update(providerCredentials)
      .set({ settings, secretEncrypted: secret, verifiedAt: now, updatedAt: now })
      .where(eq(providerCredentials.id, found.id));
    return;
  }

  await db.insert(providerCredentials).values({
    tenantId: actor.tenantId,
    kind: "smtp",
    settings,
    secretEncrypted: secret,
    verifiedAt: now,
  });
}

/**
 * R16.1. Takes the account off.
 *
 * Bulk sending stops and the shared transactional allowance carries the rest,
 * which is what a church that has changed providers wants while it sets the new
 * one up.
 */
export async function removeEmailProvider(db: Tx, actor: WriteActor): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "manageMessaging");
  await db
    .delete(providerCredentials)
    .where(and(eq(providerCredentials.kind, "smtp"), eq(providerCredentials.tenantId, actor.tenantId)));
}
