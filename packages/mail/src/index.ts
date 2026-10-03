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
