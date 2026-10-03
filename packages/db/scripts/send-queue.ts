/**
 * R16.6. Carries queued messages, outside any request.
 *
 * A church that schedules a message for Thursday morning has the laptop shut on
 * Thursday morning, so something other than a page has to carry it. This is
 * that something: a script a scheduler runs every minute.
 *
 * It lives here rather than behind a route in the web app because finding the
 * due sends means reading across every church, and that needs the owner
 * connection. The owner connection never appears in a request path, which is
 * what makes tenant isolation a property of the database rather than of our
 * care. A test enforces it.
 *
 *   pnpm --filter @hearth/db send-queue
 */
import { owner, withTenant, closeConnections } from "../src/client";
import {
  emailConnection, nextBatch, markSending, markRecipient, finishIfDone, BATCH,
} from "../src/index";
import { sendMail } from "@hearth/mail";

/** How many sends one pass looks at. A pass is cheap and runs often. */
const SENDS_PER_PASS = 20;

async function main(): Promise<void> {
  const due = await owner()<{ id: string; tenant_id: string }[]>`
    select id, tenant_id
      from sends
     where status in ('scheduled', 'sending')
       and send_at <= now()
     order by send_at
     limit ${SENDS_PER_PASS}`;

  if (due.length === 0) {
    await closeConnections();
    return;
  }

  let sent = 0;
  let failed = 0;

  for (const row of due) {
    const context = { tenantId: row.tenant_id, role: "owner" as const };

    const account = await withTenant(context, (tx) => emailConnection(tx));
    if (!account) {
      // Nothing can go, and nothing is marked, so the send waits for an account
      // rather than burning four hundred addresses as failures.
      continue;
    }

    await withTenant(context, (tx) => markSending(tx, row.id));
    const batch = await withTenant(context, (tx) => nextBatch(tx, row.id, BATCH));

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

    await withTenant(context, (tx) => finishIfDone(tx, row.id));
  }

  console.log(`${due.length} send(s) due. ${sent} sent, ${failed} failed.`);
  await closeConnections();
}

void main();
