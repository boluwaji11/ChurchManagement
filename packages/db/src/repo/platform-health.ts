import { owner } from "../client";
import { platformAdmin } from "./platform";

/**
 * HRT-394, HRT-396, R21.x. What the platform itself is doing.
 *
 * Everything here reads across every church, which no tenant role may do, so
 * it runs on the owner connection behind the same check as the rest of the
 * portal: the asking account has to be a live platform admin. Two functions at
 * the bottom are the exception and say why.
 */

async function requireAdmin(userId: string): Promise<void> {
  const who = await platformAdmin(userId);
  if (!who) throw new Error("This account does not operate the platform.");
}

/**
 * HRT-394. Whether the two tables this file adds are there yet.
 *
 * The portal can be deployed before migration 0163 has been applied, and a
 * screen that cannot be opened at all is a worse answer than one that says
 * which migration is owed.
 *
 * Asked once rather than caught per query, and that is not a style
 * preference. The first version let each read fail and swallowed the
 * "undefined table" error. It worked, and then the whole app stopped
 * answering: the status screen writes seven readings and a prune at once, and
 * eight concurrent failing queries against an owner pool of four leaves the
 * pool deadlocked, permanently, for every later request. Unauthenticated
 * screens stayed instant while every other one hung on nothing, which is a
 * horrible thing to debug and a worse thing to deploy.
 *
 * So nothing is issued that is known to fail. The answer is held for a minute,
 * because the only thing that changes it is somebody running a migration.
 */
const TABLES_HELD_MS = 60_000;
let tablesAt = 0;
let tablesThere = false;

export async function watching(): Promise<boolean> {
  const now = Date.now();
  if (tablesThere && now - tablesAt < TABLES_HELD_MS) return true;
  if (!tablesThere && now - tablesAt < TABLES_HELD_MS && tablesAt > 0) return false;

  const rows = await owner()<{ there: boolean }[]>`
    select count(*) = 2 as there
      from information_schema.tables
     where table_schema = 'public'
       and table_name in ('platform_checks', 'platform_sign_ins')`;
  tablesThere = rows[0]?.there ?? false;
  tablesAt = now;
  return tablesThere;
}

/** What a probe concluded. `off` is a service this environment has no key for. */
export type Health = "pass" | "warn" | "fail" | "off";

export interface Check {
  service: string;
  state: Health;
  at: Date;
  tookMs: number | null;
  said: string | null;
}

/**
 * HRT-394. Write down what a service just said.
 *
 * Not behind the admin check: the probe runs from a cron with no operator at
 * the keyboard. It writes and never reads, and the route in front of it is
 * held shut by CRON_SECRET.
 */
export async function recordCheck(
  one: { service: string; state: Health; tookMs?: number | null; said?: string | null },
  environment: string,
): Promise<void> {
  if (!(await watching())) return;
  await owner()`
    insert into platform_checks (service, state, took_ms, said, environment)
    values (${one.service}, ${one.state}, ${one.tookMs ?? null},
            ${one.said?.slice(0, 500) ?? null}, ${environment})`;
}

/**
 * HRT-394. Thirty days is as far back as anybody has ever looked.
 *
 * Pruned on the way in rather than on a clock of its own, because a second
 * schedule is a second thing to notice has stopped.
 */
export async function pruneChecks(): Promise<void> {
  if (!(await watching())) return;
  await owner()`delete from platform_checks where at < now() - interval '30 days'`;
}

/** HRT-394. The last thing each service said, newest first. */
export async function latestChecks(by: string, environment: string): Promise<Check[]> {
  await requireAdmin(by);
  if (!(await watching())) return [];
  return owner()<Check[]>`
    select distinct on (service)
           service, state, at, took_ms as "tookMs", said
      from platform_checks
     where environment = ${environment}
     order by service, at desc`;
}

/**
 * HRT-394. One service's recent answers, oldest first, for the row of bars.
 *
 * Oldest first because the row reads left to right as time does.
 */
export async function checkHistory(
  by: string,
  service: string,
  environment: string,
  limit = 48,
): Promise<Check[]> {
  await requireAdmin(by);
  if (!(await watching())) return [];
  const rows = await owner()<Check[]>`
    select service, state, at, took_ms as "tookMs", said
      from platform_checks
     where service = ${service} and environment = ${environment}
     order by at desc
     limit ${Math.min(Math.max(limit, 1), 200)}`;
  return rows.reverse();
}

/** HRT-394. Every service's recent answers in one statement. */
export async function recentChecks(
  by: string,
  environment: string,
  perService = 48,
): Promise<Map<string, Check[]>> {
  await requireAdmin(by);
  if (!(await watching())) return new Map();
  const rows = await owner()<(Check & { rank: number })[]>`
    select service, state, at, took_ms as "tookMs", said, rank from (
      select service, state, at, took_ms, said,
             row_number() over (partition by service order by at desc) as rank
        from platform_checks
       where environment = ${environment}
         and at > now() - interval '7 days'
    ) ranked
    where rank <= ${Math.min(Math.max(perService, 1), 200)}
    order by service, at asc`;

  const out = new Map<string, Check[]>();
  for (const row of rows) {
    const list = out.get(row.service) ?? [];
    list.push({ service: row.service, state: row.state, at: row.at, tookMs: row.tookMs, said: row.said });
    out.set(row.service, list);
  }
  return out;
}

/**
 * HRT-394. How far each integration has actually reached the churches.
 *
 * A key that works is not the same as an integration that is being used, and
 * the second number is the one that says whether a feature shipped or only
 * landed. One statement, because every line of it is a count over an indexed
 * column and seven round trips to say one sentence is seven too many.
 */
export interface Spread {
  churches: number;
  /** R13.1. Churches that have started connecting a Stripe account. */
  stripeAccounts: number;
  /** Stripe will take a payment on it. */
  stripeCharging: number;
  /** Connected to a live Stripe account rather than a test one. */
  stripeLive: number;
  /** R16.1. Churches that have connected their own mail account. */
  emailConnected: number;
  /** HRT-387. Grants that lapse inside a fortnight unless something refreshes them. */
  grantsExpiring: number;
  /** What a provider last refused, counted. */
  providerErrors: number;
}

export async function spread(by: string): Promise<Spread> {
  await requireAdmin(by);
  const rows = await owner()<Spread[]>`
    select
      (select count(*)::int from tenants where archived_at is null) as churches,
      (select count(*)::int from stripe_accounts) as "stripeAccounts",
      (select count(*)::int from stripe_accounts where charges_enabled) as "stripeCharging",
      (select count(*)::int from stripe_accounts where livemode) as "stripeLive",
      (select count(*)::int from church_providers
        where channel = 'email' and state = 'connected') as "emailConnected",
      (select count(*)::int from church_providers
        where state = 'connected'
          and credential_expires_at is not null
          and credential_expires_at < now() + interval '14 days') as "grantsExpiring",
      (select count(*)::int from church_providers
        where state = 'connected' and last_error is not null) as "providerErrors"`;
  return rows[0]!;
}

/**
 * HRT-394, R16.6. The send queue, which is the one piece of this product that
 * can be quietly broken while every screen looks fine.
 *
 * A worker that stopped leaves rows sitting in `queued` and rows stuck in
 * `sending` with a `claimed_at` nobody came back for. Neither shows up
 * anywhere a church would see.
 */
export interface Queue {
  waiting: number;
  sending: number;
  /** Claimed over an hour ago and still not finished, which is a dead worker. */
  stuck: number;
  failed24h: number;
  bounced24h: number;
  sent24h: number;
  /** When the oldest waiting copy was written. */
  oldest: Date | null;
}

export async function queue(by: string): Promise<Queue> {
  await requireAdmin(by);
  const rows = await owner()<Queue[]>`
    select
      (select count(*)::int from email_recipients where state = 'queued') as waiting,
      (select count(*)::int from email_recipients where state = 'sending') as sending,
      (select count(*)::int from email_recipients
        where state = 'sending' and claimed_at < now() - interval '1 hour') as stuck,
      (select count(*)::int from email_recipients
        where state = 'failed' and at > now() - interval '24 hours') as "failed24h",
      (select count(*)::int from email_recipients
        where state = 'bounced' and at > now() - interval '24 hours') as "bounced24h",
      (select count(*)::int from email_recipients
        where state = 'sent' and at > now() - interval '24 hours') as "sent24h",
      (select min(at) from email_recipients where state = 'queued') as oldest`;
  return rows[0]!;
}

/**
 * HRT-395, R22.x. What the churches have been doing, by week.
 *
 * Twelve weeks of the audit log, which is the only record that covers every
 * church and every kind of work. It answers the question the numbers on the
 * overview cannot: whether the line is going up.
 */
export interface Week {
  week: Date;
  churches: number;
  entries: number;
}

export async function weeks(by: string, howMany = 12): Promise<Week[]> {
  await requireAdmin(by);
  return owner()<Week[]>`
    select date_trunc('week', a.at) as week,
           count(distinct a.tenant_id)::int as churches,
           count(*)::int as entries
      from audit_entries a
     where a.at > now() - (${Math.min(Math.max(howMany, 1), 52)} * interval '1 week')
     group by 1
     order by 1 asc`;
}

export interface ChurchWiring {
  stripeAccountId: string | null;
  stripeCharges: boolean;
  stripePayouts: boolean;
  stripeDetails: boolean;
  stripeLive: boolean;
  nonprofitRateAt: Date | null;
  emailVendor: string | null;
  emailState: string | null;
  emailFrom: string | null;
  emailExpires: Date | null;
  emailError: string | null;
  /** R21.4. How much of its quota the church has used. */
  storageBytes: number;
}

/**
 * HRT-393, R21.x. One church's wiring, for the screen somebody opens when
 * that church writes in.
 *
 * The questions support actually gets are "our giving page is broken" and "our
 * emails are not arriving", and both were answered until now by opening Stripe
 * in one tab and the database in another. This is both answers on the screen
 * that already has the church's name on it.
 */
export async function churchWiring(by: string, tenantId: string): Promise<ChurchWiring> {
  await requireAdmin(by);
  const rows = await owner()<ChurchWiring[]>`
    select
      s.account_id as "stripeAccountId",
      coalesce(s.charges_enabled, false) as "stripeCharges",
      coalesce(s.payouts_enabled, false) as "stripePayouts",
      coalesce(s.details_submitted, false) as "stripeDetails",
      coalesce(s.livemode, false) as "stripeLive",
      s.nonprofit_rate_at as "nonprofitRateAt",
      p.vendor as "emailVendor",
      p.state as "emailState",
      p.from_address as "emailFrom",
      p.credential_expires_at as "emailExpires",
      p.last_error as "emailError",
      /* Double rather than bigint: postgres.js hands a bigint back as a
         string, and a quota in the gigabytes is nowhere near where a double
         stops being exact. */
      coalesce((select sum(f.bytes)::double precision from stored_files f
                 where f.tenant_id = ${tenantId}::uuid), 0) as "storageBytes"
      from (select 1) one
      left join stripe_accounts s on s.tenant_id = ${tenantId}::uuid
      left join church_providers p
        on p.tenant_id = ${tenantId}::uuid and p.channel = 'email'`;
  return rows[0]!;
}

export interface SignIn {
  at: Date;
  email: string;
  outcome: string;
  ip: string | null;
}

/** HRT-396. Who has tried the portal's door, newest first. */
export async function signIns(by: string, limit = 50): Promise<SignIn[]> {
  await requireAdmin(by);
  if (!(await watching())) return [];
  return owner()<SignIn[]>`
    select at, email, outcome, ip
      from platform_sign_ins
     order by at desc
     limit ${Math.min(Math.max(limit, 1), 200)}`;
}

/**
 * HRT-396. Write down an attempt.
 *
 * Not behind the admin check, and it cannot be: the attempts worth recording
 * are the ones made by somebody who is not an operator. It only ever inserts.
 */
export async function recordSignIn(one: {
  email: string;
  outcome: "in" | "wrong" | "refused" | "throttled";
  ip?: string | null;
  agent?: string | null;
}): Promise<void> {
  if (!(await watching())) return;
  await owner()`
    insert into platform_sign_ins (email, outcome, ip, agent)
    values (${one.email.slice(0, 320).toLowerCase()}, ${one.outcome},
            ${one.ip?.slice(0, 64) ?? null}, ${one.agent?.slice(0, 300) ?? null})`;
}

/** HRT-396. How many refusals in a row before an address has to wait. */
export const ATTEMPTS = 5;
/** And for how long. */
export const LOCKOUT_MINUTES = 15;

/**
 * HRT-396, R21.1. Whether this address has to wait before trying again.
 *
 * Counted from the last time it got in, so a correct password clears the
 * count rather than leaving somebody who mistyped twice this morning one
 * mistake from a lockout this afternoon.
 *
 * Not behind the admin check, for the same reason as the write above: it is
 * asked before anybody is known. It reads one indexed count and returns a
 * number.
 */
export async function waitingOut(email: string): Promise<number> {
  if (!(await watching())) return 0;
  const rows = await owner()<{ failures: number }[]>`
    select count(*)::int as failures
      from platform_sign_ins
     where lower(email) = ${email.trim().toLowerCase()}
       and outcome in ('wrong', 'refused')
       and at > now() - (${LOCKOUT_MINUTES} * interval '1 minute')
       and at > coalesce((
         select max(at) from platform_sign_ins
          where lower(email) = ${email.trim().toLowerCase()} and outcome = 'in'
       ), 'epoch'::timestamptz)`;
  const failures = rows[0]?.failures ?? 0;
  return failures >= ATTEMPTS ? LOCKOUT_MINUTES : 0;
}
