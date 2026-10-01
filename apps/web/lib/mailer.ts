import "server-only";
import nodemailer from "nodemailer";
import type { SenderCredentials } from "@hearth/db";

/**
 * R16.2. Sending through the church's own provider.
 *
 * Two providers, because a church either has a Resend account or has the email
 * account it already pays for. Everything leaves under the church's own domain
 * and is counted against the church's own quota. Hearth resells nothing, which
 * is the line that keeps a donation-funded platform alive at ten thousand
 * churches.
 *
 * A failure comes back as a sentence from the provider rather than an
 * exception, because the person reading it is setting a key up and the
 * provider's own words are the most useful thing we have.
 */

export interface Message {
  to: string;
  subject: string;
  text: string;
}

export type SendResult = { ok: true } | { ok: false; error: string };

const from = (sender: SenderCredentials) => `${sender.fromName} <${sender.fromEmail}>`;

export async function sendMail(sender: SenderCredentials, message: Message): Promise<SendResult> {
  if (!sender.secret) return { ok: false, error: "No key on file." };
  try {
    return sender.provider === "resend"
      ? await viaResend(sender, message)
      : await viaSmtp(sender, message);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function viaResend(sender: SenderCredentials, message: Message): Promise<SendResult> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${sender.secret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: from(sender),
      to: [message.to],
      subject: message.subject,
      text: message.text,
      ...(sender.replyTo ? { reply_to: sender.replyTo } : {}),
    }),
  });

  if (response.ok) return { ok: true };

  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  return { ok: false, error: body?.message ?? `Resend answered ${response.status}.` };
}

async function viaSmtp(sender: SenderCredentials, message: Message): Promise<SendResult> {
  const port = sender.port ?? 587;
  const transport = nodemailer.createTransport({
    host: sender.host ?? "",
    port,
    // 465 is TLS from the first byte. Everything else starts plain and upgrades.
    secure: port === 465,
    auth: { user: sender.username ?? "", pass: sender.secret ?? "" },
  });

  await transport.sendMail({
    from: from(sender),
    to: message.to,
    subject: message.subject,
    text: message.text,
    ...(sender.replyTo ? { replyTo: sender.replyTo } : {}),
  });
  return { ok: true };
}
