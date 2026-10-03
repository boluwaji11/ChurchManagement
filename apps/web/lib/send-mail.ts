import {
  withTenant, emailConnection, sharedAllowance, recordSend,
  type TransactionalPurpose, type TenantRole,
} from "@hearth/db";
import { sendMail, sharedAccount, type Message } from "@hearth/mail";
import { t } from "@hearth/i18n";

/**
 * R16.1, R16.3. One way out for a transactional message.
 *
 * The church's own account carries it where one is set up. Otherwise the shared
 * allowance does, until the allowance for the month is spent. Every attempt is
 * written to the ledger either way, so a church asking why a message never
 * arrived has somewhere to look.
 *
 * Every caller goes through here. A code path that opens its own transport
 * would be a code path the allowance does not count and the ledger does not
 * know about.
 */

export interface SendContext {
  tenantId: string;
  role: TenantRole;
  userId?: string;
}

export interface Sent {
  sent: boolean;
  via?: "church" | "shared";
  error?: string;
}

export async function sendTransactional(
  context: SendContext,
  purpose: TransactionalPurpose,
  message: Message,
): Promise<Sent> {
  const ctx = context;
  const actor = context;

  const own = await withTenant(ctx, (tx) => emailConnection(tx));

  if (own) {
    const result = await sendMail(own, message);
    await withTenant(ctx, (tx) =>
      recordSend(tx, actor, {
        purpose,
        toEmail: message.to,
        via: "church",
        status: result.sent ? "sent" : "failed",
        reason: result.reason,
      }),
    );
    return result.sent
      ? { sent: true, via: "church" }
      : { sent: false, error: result.reason };
  }

  const shared = sharedAccount();
  const allowance = await withTenant(ctx, (tx) => sharedAllowance(tx));

  if (!shared || allowance.remaining <= 0) {
    const error = shared ? t("mail.error.spent") : t("mail.error.none");
    await withTenant(ctx, (tx) =>
      recordSend(tx, actor, {
        purpose,
        toEmail: message.to,
        via: "shared",
        status: "refused",
        reason: error,
      }),
    );
    return { sent: false, error };
  }

  const result = await sendMail(shared, message);
  await withTenant(ctx, (tx) =>
    recordSend(tx, actor, {
      purpose,
      toEmail: message.to,
      via: "shared",
      status: result.sent ? "sent" : "failed",
      reason: result.reason,
    }),
  );
  return result.sent
    ? { sent: true, via: "shared" }
    : { sent: false, error: result.reason };
}
