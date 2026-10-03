import {
  withTenant, emailConnection, dueSends, nextBatch, markSending, markRecipient,
  finishIfDone, BATCH,
  type TenantRole,
} from "@hearth/db";
import { sendMail } from "@hearth/mail";

/**
 * R16.6. Carries a queued send, a batch at a time.
 *
 * Driven from outside rather than looping here: one call does one batch, and
 * whatever called it calls again while there is more. That makes a send
 * resumable without a process that has to stay alive, which is what a platform
 * running on donations can afford.
 *
 * Bulk runs on the church's own account, always. The shared allowance is for
 * the handful of transactional messages that have to work on day one.
 */

export interface RunContext {
  tenantId: string;
  role: TenantRole;
  userId?: string;
}

export interface RunResult {
  attempted: number;
  sent: number;
  failed: number;
  /** True when this send has nothing left waiting. */
  done: boolean;
}

export async function runOneBatch(
  context: RunContext,
  sendId: string,
  size = BATCH,
): Promise<RunResult> {
  const account = await withTenant(context, (tx) => emailConnection(tx));
  if (!account) {
    // Nothing can go, and nothing is marked, so the send waits for an account
    // rather than burning through four hundred addresses as failures.
    return { attempted: 0, sent: 0, failed: 0, done: false };
  }

  await withTenant(context, (tx) => markSending(tx, sendId));
  const batch = await withTenant(context, (tx) => nextBatch(tx, sendId, size));

  let sent = 0;
  let failed = 0;

  for (const one of batch) {
    const result = await sendMail(account, {
      to: one.toEmail,
      subject: one.subject,
      text: one.body,
    });
    if (result.sent) sent += 1;
    else failed += 1;

    await withTenant(context, (tx) =>
      markRecipient(tx, one.id, result.sent ? "sent" : "failed", result.reason),
    );
  }

  const done = await withTenant(context, (tx) => finishIfDone(tx, sendId));
  return { attempted: batch.length, sent, failed, done };
}

/** R16.6. Every send this church has due, one batch each. */
export async function runDue(context: RunContext): Promise<RunResult[]> {
  const ids = await withTenant(context, (tx) => dueSends(tx));
  const out: RunResult[] = [];
  for (const id of ids) out.push(await runOneBatch(context, id));
  return out;
}
