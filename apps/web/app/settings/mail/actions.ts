"use server";

import {
  withTenant, getEmailProvider, proposedConnection, saveEmailProvider,
  removeEmailProvider, type SmtpInput,
} from "@hearth/db";
import { sendMail } from "@hearth/mail";
import { t } from "@hearth/i18n";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

async function context(church?: string) {
  const session = await requireSession(church);
  return {
    session,
    actor: { tenantId: session.tenantId, role: session.role, userId: session.userId },
    ctx: { tenantId: session.tenantId, role: session.role, userId: session.userId },
  };
}

export interface MailResult {
  error?: string;
  sent?: string;
}

/**
 * R16.1. Tests the account, then saves it.
 *
 * In that order, deliberately. A church that leaves this screen believing its
 * mail is set up, and finds out three weeks later that nothing has gone out,
 * has lost three weeks of whatever it was sending.
 *
 * The password is read from the form or from what is already stored, used, and
 * never returned.
 */
export async function saveMail(input: SmtpInput, church?: string): Promise<MailResult> {
  const { session, actor, ctx } = await context(church);
  try {
    const account = await withTenant(ctx, (tx) => proposedConnection(tx, actor, input));

    const result = await sendMail(
      { ...account, password: account.password },
      {
        to: session.email,
        subject: t("mail.test.subject"),
        text: t("mail.test.body"),
      },
    );
    if (!result.sent) return { error: result.reason ?? t("mail.failed") };

    await withTenant(ctx, (tx) => saveEmailProvider(tx, actor, input));
    return { sent: session.email };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function dropMail(church?: string): Promise<MailResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => removeEmailProvider(tx, actor));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** Read for the screen. The password is not in what comes back. */
export async function currentMail(church?: string) {
  const { ctx } = await context(church);
  return withTenant(ctx, (tx) => getEmailProvider(tx));
}
