import { createTransport } from "nodemailer";

/**
 * R16.1. Sending, over the church's own SMTP account.
 *
 * Its own package rather than something in the web app, because the thing that
 * sends in anger is the job worker and the web app only ever sends one test
 * message. Both need the same transport and neither should own it.
 *
 * Nothing here logs a credential. A failure returns the provider's message,
 * which is what tells a church it typed the password wrong, and nothing else.
 */

export interface MailAccount {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string | null;
  replyTo: string | null;
}

export interface Message {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendResult {
  sent: boolean;
  /** What the server said, when it refused. */
  reason?: string;
}

const transportFor = (account: MailAccount) =>
  createTransport({
    host: account.host,
    port: account.port,
    secure: account.secure,
    auth: { user: account.username, pass: account.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

const from = (account: MailAccount): string =>
  account.fromName ? `"${account.fromName}" <${account.fromEmail}>` : account.fromEmail;

/** The message a provider's refusal is worth showing. Never the credentials. */
const reasonFrom = (error: unknown): string =>
  error instanceof Error ? error.message : "The mail server refused the connection.";

/** R16.1. Opens a connection and checks the credentials, sending nothing. */
export async function verifyAccount(account: MailAccount): Promise<SendResult> {
  const transport = transportFor(account);
  try {
    await transport.verify();
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: reasonFrom(error) };
  } finally {
    transport.close();
  }
}

/** R16.1. Sends one message. */
export async function sendMail(
  account: MailAccount,
  message: Message,
): Promise<SendResult> {
  const transport = transportFor(account);
  try {
    await transport.sendMail({
      from: from(account),
      to: message.to,
      replyTo: account.replyTo ?? undefined,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: reasonFrom(error) };
  } finally {
    transport.close();
  }
}

/**
 * R16.3. The account Hearth pays for, which carries the shared allowance.
 *
 * Unset in a development environment, and that is a working state: the ledger
 * records a refusal and the screen that asked for the message says so, rather
 * than the message disappearing.
 */
export function sharedAccount(): MailAccount | null {
  const host = process.env.SHARED_SMTP_HOST;
  const username = process.env.SHARED_SMTP_USER;
  const password = process.env.SHARED_SMTP_PASSWORD;
  const fromEmail = process.env.SHARED_SMTP_FROM;
  if (!host || !username || !password || !fromEmail) return null;

  return {
    host,
    port: Number(process.env.SHARED_SMTP_PORT ?? 587),
    secure: process.env.SHARED_SMTP_SECURE === "true",
    username,
    password,
    fromEmail,
    fromName: process.env.SHARED_SMTP_FROM_NAME ?? null,
    replyTo: null,
  };
}
