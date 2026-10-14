import { and, asc, eq, isNull, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { owner } from "../client";
import { emailSends, emailRecipients, contactConsent, churchProviders } from "../schema/messaging";
import { tenants } from "../schema/tenancy";
import { openCredential, sealCredential, CREDENTIAL_KEY_ID } from "../crypto";

/**
 * HRT-141, R16.6. The queue behind a send.
 *
 * Everything here runs in the worker, as the owner, with no session: a church
 * presses send and closes the laptop, and the copies still have to go. That is
 * the whole reason the queue exists, so there is nobody to be signed in as.
 *
 * The rules that decide who may be written to are not here. They were applied
 * when the rows were written, which is the point at which a church could still
 * see what it was about to do.
 */

/** How many copies one pass of the worker attempts. */
export const BATCH = 25;

export interface DueSend {
  id: string;
  tenantId: string;
  subject: string;
  body: string;
  churchName: string;
  /** The church's own postal address, for the fine print. */
  postal: string;
  /** Where the way out points. */
  origin: string;
  waiting: number;
}

/**
 * R16.6. Sends with copies still waiting, and the time has come.
 *
 * A send with a future time is not due, which is the whole of scheduling: the
 * row sits there and the worker walks past it until the clock catches up.
 */
export async function dueSends(limit = 5): Promise<DueSend[]> {
  const db = drizzle(owner());

  const rows = await db
    .select({
      id: emailSends.id,
      tenantId: emailSends.tenantId,
      subject: emailSends.subject,
      body: emailSends.body,
      churchName: tenants.name,
      origin: emailSends.origin,
      line1: tenants.addressLine1,
      city: tenants.city,
      region: tenants.region,
      postcode: tenants.postalCode,
      waiting: sql<number>`(
        select count(*)::int from email_recipients r
        where r.send_id = ${emailSends.id} and r.state = 'queued'
      )`,
    })
    .from(emailSends)
    .innerJoin(tenants, eq(tenants.id, emailSends.tenantId))
    .where(
      and(
        or(eq(emailSends.state, "queued"), eq(emailSends.state, "sending")),
        or(isNull(emailSends.sendAt), lte(emailSends.sendAt, new Date())),
      ),
    )
    .orderBy(asc(emailSends.sendAt), asc(emailSends.createdAt))
    .limit(limit);

  return rows
    .filter((one) => one.waiting > 0)
    .map((one) => ({
      id: one.id,
      tenantId: one.tenantId,
      subject: one.subject,
      body: one.body,
      churchName: one.churchName,
      origin: one.origin ?? "",
      postal: [one.line1, one.city, [one.region, one.postcode].filter(Boolean).join(" ")]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(" · "),
      waiting: one.waiting,
    }));
}

export interface Waiting {
  id: string;
  memberId: string | null;
  address: string;
  first: string;
  name: string;
  /** R16.8. The way out this person's copy carries. */
  token: string | null;
}

/**
 * R16.6. The next batch of copies, taken so nobody else takes them.
 *
 * `skip locked` is what makes two workers safe: a row another pass already
 * holds is stepped over rather than waited for, so a slow provider on one
 * batch never stalls the next.
 */
export async function claimBatch(sendId: string, size = BATCH): Promise<Waiting[]> {
  const db = drizzle(owner());

  const rows = await db.execute(sql`
    with taken as (
      select id from email_recipients
      where send_id = ${sendId} and state = 'queued'
      order by at
      limit ${size}
      for update skip locked
    )
    update email_recipients r
    set state = 'sending'
    from taken
    where r.id = taken.id
    returning r.id, r.member_id, r.address
  `);

  const out: Waiting[] = [];
  for (const raw of rows as unknown as { id: string; member_id: string | null; address: string }[]) {
    const [person] = raw.member_id
      ? await db.execute(sql`
          select coalesce(m.preferred_name, m.first_name) as first,
                 coalesce(m.preferred_name, m.first_name) || ' ' || m.last_name as name
          from members m where m.id = ${raw.member_id}
        `) as unknown as { first: string; name: string }[]
      : [];

    const [consent] = await db
      .select({ token: contactConsent.token })
      .from(contactConsent)
      .where(
        and(
          eq(contactConsent.channel, "email"),
          raw.member_id
            ? eq(contactConsent.memberId, raw.member_id)
            : eq(contactConsent.address, raw.address),
        ),
      )
      .limit(1);

    out.push({
      id: raw.id,
      memberId: raw.member_id,
      address: raw.address,
      first: person?.first ?? raw.address,
      name: person?.name ?? raw.address,
      token: consent?.token ?? null,
    });
  }

  await db
    .update(emailSends)
    .set({ state: "sending", claimedAt: new Date(), updatedAt: new Date() })
    .where(eq(emailSends.id, sendId));

  return out;
}

/** R16.6, R16.7. What happened to one copy. */
export async function settle(
  recipientId: string,
  outcome: { ok: boolean; said: string | null },
): Promise<void> {
  const db = drizzle(owner());
  await db
    .update(emailRecipients)
    .set({ state: outcome.ok ? "sent" : "failed", said: outcome.said })
    .where(eq(emailRecipients.id, recipientId));
}

/**
 * R16.6. The tally, once nothing is left waiting.
 *
 * Counted from the rows rather than kept as a running total, because a worker
 * that dies mid-batch would leave a running total wrong and nobody would ever
 * know which number to believe.
 */
export async function closeIfDone(sendId: string): Promise<boolean> {
  const db = drizzle(owner());

  const [tally] = await db
    .select({
      waiting: sql<number>`count(*) filter (where ${emailRecipients.state} in ('queued','sending'))::int`,
      delivered: sql<number>`count(*) filter (where ${emailRecipients.state} = 'sent')::int`,
      failed: sql<number>`count(*) filter (where ${emailRecipients.state} = 'failed')::int`,
    })
    .from(emailRecipients)
    .where(eq(emailRecipients.sendId, sendId));

  if (!tally || tally.waiting > 0) return false;

  await db
    .update(emailSends)
    .set({
      state: tally.delivered > 0 ? "sent" : "failed",
      delivered: tally.delivered,
      failed: tally.failed,
      updatedAt: new Date(),
    })
    .where(eq(emailSends.id, sendId));

  return true;
}

/** R16.6. How far a send has got, for the screen that is watching it. */
export async function progressOf(sendId: string): Promise<{ done: number; total: number }> {
  const db = drizzle(owner());
  const [row] = await db
    .select({
      done: sql<number>`count(*) filter (where ${emailRecipients.state} in ('sent','failed'))::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(emailRecipients)
    .where(eq(emailRecipients.sendId, sendId));
  return { done: row?.done ?? 0, total: row?.total ?? 0 };
}

export interface SendingAccountForWorker {
  vendor: string;
  credential: string;
  fromName: string | null;
  fromAddress: string | null;
  settings: unknown;
}

/**
 * R21.15. The church's own account, opened in the worker and nowhere else.
 *
 * No read path on a screen selects this column. The worker is the one place
 * a credential is ever in the clear, which is what makes that structural
 * rather than a habit.
 */
export async function accountFor(tenantId: string): Promise<SendingAccountForWorker | null> {
  const db = drizzle(owner());
  const [row] = await db
    .select({
      vendor: churchProviders.vendor,
      credential: churchProviders.credential,
      fromName: churchProviders.fromName,
      fromAddress: churchProviders.fromAddress,
      settings: churchProviders.settings,
    })
    .from(churchProviders)
    .where(
      and(
        eq(churchProviders.tenantId, tenantId),
        eq(churchProviders.channel, "email"),
        eq(churchProviders.state, "connected"),
      ),
    )
    .limit(1);

  if (!row?.credential) return null;
  return { ...row, credential: openCredential(row.credential) };
}

/**
 * R16.1, R21.15. The rotated refresh token, written back by the worker.
 *
 * Resend refuses a refresh token used twice and revokes the grant when one is
 * replayed, so the new one has to be written down before a single copy goes
 * out. There is no session here: the worker has the tenant and nothing else.
 */
export async function rotateCredentialAsOwner(
  tenantId: string,
  refreshToken: string,
): Promise<void> {
  const db = drizzle(owner());
  await db
    .update(churchProviders)
    .set({
      credential: sealCredential(refreshToken),
      credentialKeyId: CREDENTIAL_KEY_ID,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(churchProviders.tenantId, tenantId),
        eq(churchProviders.channel, "email"),
        eq(churchProviders.state, "connected"),
      ),
    );
}
