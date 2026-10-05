import { owner, withTenant } from "../client";
import { withAuditTriggersOff } from "../maintenance";
import { loadDemoData } from "./load";

/**
 * R19.7 and R22.1. A demo church, belonging to nobody.
 *
 * The sample members used to be loadable into a real church, which put invented
 * records one press from a giving statement. They live in a church of their own
 * now: created on the way in, filled, and thrown away a day later. Nobody can
 * mistake it for their own directory because it is not their directory.
 *
 * Every visitor gets their own, so pressing everything is safe, including the
 * destructive things a demo is for trying.
 */

/** Long enough to look around twice, short enough that nobody settles in. */
export const DEMO_LIFETIME_HOURS = 24;

/**
 * How many demo churches wait, built and unclaimed.
 *
 * Building one takes long enough that a visitor watching a blank page decides
 * against us before it finishes. So they are built in advance and handed over,
 * and the pool is topped up after the visitor has already gone in.
 */
export const DEMO_POOL_TARGET = 2;

/** How long an unclaimed church waits before the sweep takes it. */
const POOL_LIFETIME_HOURS = 24 * 7;

export interface DemoChurch {
  tenantId: string;
  slug: string;
  name: string;
  expiresAt: Date;
}

const suffix = () => Math.random().toString(36).slice(2, 8);

/**
 * Builds a demo church for one visitor and fills it.
 *
 * Runs as the owner connection rather than through createChurch, because the
 * visitor has no verified email address and never will: an anonymous sign-in is
 * the whole point. The Owner role they get is over a church that holds nothing
 * but invented members and disappears tomorrow.
 */
const DEMO_NAME = "Grace Community Church";

/**
 * Builds one demo church and leaves it unclaimed.
 *
 * Runs as the owner connection rather than through createChurch, because a demo
 * visitor has no verified email address and never will: an anonymous sign-in is
 * the whole point. The Owner role they are given is over a church that holds
 * invented members and disappears tomorrow.
 */
async function buildDemoChurch(): Promise<{ tenantId: string; slug: string }> {
  const slug = `demo-${suffix()}`;
  const sql = owner();

  const [tenant] = await sql<{ id: string }[]>`
    insert into tenants (slug, name, timezone, demo_expires_at)
    values (
      ${slug}, ${DEMO_NAME}, 'America/Chicago',
      ${new Date(Date.now() + POOL_LIFETIME_HOURS * 60 * 60 * 1000)}
    )
    returning id`;

  const tenantId = tenant!.id;

  await sql`
    insert into campuses (tenant_id, name, is_primary)
    values (${tenantId}, ${DEMO_NAME}, true)`;

  await withTenant({ tenantId, role: "owner" }, (db) =>
    loadDemoData(db, { tenantId, role: "owner" }),
  );

  return { tenantId, slug };
}

/**
 * Hands a visitor a church that is already built.
 *
 * Takes one from the pool, names them its owner and starts its clock. Where the
 * pool is empty, one is built while they wait, which is the old behaviour and
 * the reason the pool exists.
 *
 * `skip locked` matters: two visitors pressing at the same moment take two
 * different churches rather than queueing for the same one.
 */
export async function createDemoChurch(userId: string): Promise<DemoChurch> {
  await sweepExpiredDemos();

  const expiresAt = new Date(Date.now() + DEMO_LIFETIME_HOURS * 60 * 60 * 1000);
  const sql = owner();

  const taken = await sql.begin(async (tx) => {
    const [waiting] = await tx<{ id: string; slug: string }[]>`
      select id, slug from tenants
       where demo_expires_at is not null
         and demo_claimed_at is null
       order by created_at
       limit 1
         for update skip locked`;
    if (!waiting) return null;

    await tx`
      update tenants
         set demo_claimed_at = now(), demo_expires_at = ${expiresAt}
       where id = ${waiting.id}`;

    await tx`
      insert into app_users (id, email, full_name)
      values (${userId}, ${`${waiting.slug}@demo.invalid`}, 'Demo visitor')
      on conflict (id) do nothing`;

    await tx`
      insert into tenant_members (tenant_id, user_id, role)
      values (${waiting.id}, ${userId}, 'owner')`;

    return waiting;
  }) as { id: string; slug: string } | null;

  if (taken) {
    return { tenantId: taken.id, slug: taken.slug, name: DEMO_NAME, expiresAt };
  }

  const built = await buildDemoChurch();
  await sql.begin(async (tx) => {
    await tx`
      update tenants
         set demo_claimed_at = now(), demo_expires_at = ${expiresAt}
       where id = ${built.tenantId}`;

    await tx`
      insert into app_users (id, email, full_name)
      values (${userId}, ${`${built.slug}@demo.invalid`}, 'Demo visitor')
      on conflict (id) do nothing`;

    await tx`
      insert into tenant_members (tenant_id, user_id, role)
      values (${built.tenantId}, ${userId}, 'owner')`;
  });

  return { tenantId: built.tenantId, slug: built.slug, name: DEMO_NAME, expiresAt };
}

/**
 * Builds churches until the pool is full again.
 *
 * Called after a visitor has already been let in, so the cost lands on nobody.
 * Building one at a time rather than all at once, because the point is to be
 * ready for the next visitor and not to hold the connection.
 */
export async function topUpDemoPool(target = DEMO_POOL_TARGET): Promise<number> {
  const [row] = await owner()<{ n: string }[]>`
    select count(*) as n from tenants
     where demo_expires_at is not null and demo_claimed_at is null`;

  let built = 0;
  for (let waiting = Number(row?.n ?? 0); waiting < target; waiting += 1) {
    await buildDemoChurch();
    built += 1;
  }
  return built;
}

export interface DemoInfo {
  isDemo: boolean;
  expiresAt: Date | null;
}

export async function demoChurchInfo(tenantId: string): Promise<DemoInfo> {
  const rows = await owner()<{ demo_expires_at: Date | null }[]>`
    select demo_expires_at from tenants where id = ${tenantId}`;
  const expiresAt = rows[0]?.demo_expires_at ?? null;
  return { isDemo: expiresAt !== null, expiresAt };
}

/**
 * Removes demo churches that have run out.
 *
 * Swept on the way in rather than on a schedule, because there is no job runner
 * yet and the moment somebody asks for a demo is a moment we are already paying
 * for a round trip. The audit triggers come off first: deleting a tenant
 * cascades to its members, and the trigger would write rows referencing the
 * tenant being deleted.
 */
export async function sweepExpiredDemos(): Promise<number> {
  // Asked before anything is disabled. Taking the triggers off locks every
  // audited table, and the answer is almost always that there is nothing to
  // sweep, so paying that on every visitor is paying it for nothing.
  const [row] = await owner()<{ n: string }[]>`
    select count(*) as n from tenants
     where demo_expires_at is not null and demo_expires_at < now()`;
  if (Number(row?.n ?? 0) === 0) return 0;

  return withAuditTriggersOff(async (sql) => {
    const gone = await sql<{ id: string }[]>`
      delete from tenants
      where demo_expires_at is not null and demo_expires_at < now()
      returning id`;
    return gone.length;
  });
}

export interface DemoMembership {
  tenantId: string;
  slug: string;
  name: string;
  expiresAt: Date;
}

/**
 * Confirms that this visitor is in this demo, and that it is still a demo.
 *
 * The pass a demo visitor carries is signed, so it cannot be rewritten to name
 * a different church. This is the second lock: the tenant has to have an expiry
 * in the future, so a pass naming a real church is refused even if the signing
 * key ever leaked. A demo can never be a way into somebody's records.
 */
export async function demoMembership(
  tenantId: string,
  userId: string,
): Promise<DemoMembership | null> {
  const rows = await owner()<{ id: string; slug: string; name: string; demo_expires_at: Date }[]>`
    select t.id, t.slug, t.name, t.demo_expires_at
    from tenants t
    join tenant_members m on m.tenant_id = t.id and m.user_id = ${userId}
    where t.id = ${tenantId}
      and t.demo_expires_at is not null
      and t.demo_expires_at > now()
    limit 1`;

  const row = rows[0];
  if (!row) return null;
  return { tenantId: row.id, slug: row.slug, name: row.name, expiresAt: row.demo_expires_at };
}
