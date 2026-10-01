"use server";

import {
  withTenant, saveEmailSender, forgetEmailSender, senderCredentials, recordSendResult,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { explain } from "@/lib/explain";
import { sendMail } from "@/lib/mailer";

export interface EmailResult {
  error?: string;
  saved?: boolean;
  sentTo?: string;
}

const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

async function context(slug: string | undefined) {
  const session = await requireSession(slug);
  return {
    session,
    ctx: { tenantId: session.tenantId, role: session.role, userId: session.userId },
  };
}

/** R16.2. Writing the church's provider down. */
export async function saveSender(data: FormData): Promise<EmailResult> {
  const { ctx } = await context(text(data, "church") || undefined);
  const port = text(data, "port");
  try {
    await withTenant(ctx, (tx) =>
      saveEmailSender(tx, ctx, {
        provider: text(data, "provider"),
        fromName: text(data, "fromName"),
        fromEmail: text(data, "fromEmail"),
        replyTo: text(data, "replyTo") || null,
        host: text(data, "host") || null,
        port: port ? Number(port) : null,
        username: text(data, "username") || null,
        secret: text(data, "secret") || null,
      }),
    );
    return { saved: true };
  } catch (error) {
    return { error: explain(error) };
  }
}

/**
 * R16.2. The test send.
 *
 * To the address of whoever is setting it up, because they are at the screen
 * and can go and look. A provider that takes a key and refuses a message has
 * told the church nothing until a Sunday morning otherwise.
 */
export async function sendTest(church?: string): Promise<EmailResult> {
  const { session, ctx } = await context(church);
  if (!session.email) return { error: t("email.error.noAddress") };

  try {
    const sender = await withTenant(ctx, (tx) => senderCredentials(tx, ctx.tenantId));
    if (!sender) return { error: t("email.error.noSender") };

    const result = await sendMail(sender, {
      to: session.email,
      subject: t("email.test.subject", { church: session.tenantName }),
      text: t("email.test.body", { church: session.tenantName }),
    });

    await withTenant(ctx, (tx) => recordSendResult(tx, ctx.tenantId, result));
    return result.ok ? { sentTo: session.email } : { error: result.error };
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R16.2. Taking it off. */
export async function removeSender(church?: string): Promise<EmailResult> {
  const { ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => forgetEmailSender(tx, ctx));
    return { saved: true };
  } catch (error) {
    return { error: explain(error) };
  }
}
