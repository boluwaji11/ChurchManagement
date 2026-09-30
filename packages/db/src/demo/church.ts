import { owner, withTenant } from "../client";
import { withAuditTriggersOff } from "../maintenance";
import { loadDemoData } from "./load";

/**
 * R19.7 and R22.1. A demo church, belonging to nobody.
 *
 * The sample people used to be loadable into a real church, which put invented
 * records one press from a giving statement. They live in a church of their own
 * now: created on the way in, filled, and thrown away a day later. Nobody can
 * mistake it for their own directory because it is not their directory.
 *
 * Every visitor gets their own, so pressing everything is safe, including the
 * destructive things a demo is for trying.
 */

/** Long enough to look around twice, short enough that nobody settles in. */
export const DEMO_LIFETIME_HOURS = 24;

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
 * but invented people and disappears tomorrow.
 */
export async function createDemoChurch(userId: string): Promise<DemoChurch> {
  await sweepExpiredDemos();

  const slug = `demo-${suffix()}`;
  const name = "Grace Community Church";
  const expiresAt = new Date(Date.now() + DEMO_LIFETIME_HOURS * 60 * 60 * 1000);
  const sql = owner();

  const tenantId = await sql.begin(async (tx) => {
    const [tenant] = await tx<{ id: string }[]>`
      insert into tenants (slug, name, timezone, demo_expires_at)
      values (${slug}, ${name}, 'America/Chicago', ${expiresAt})
      returning id`;

    await tx`
      insert into campuses (tenant_id, name, is_primary)
      values (${tenant!.id}, ${name}, true)`;

    await tx`
      insert into app_users (id, email, full_name)
      values (${userId}, ${`${slug}@demo.invalid`}, 'Demo visitor')
      on conflict (id) do nothing`;

    await tx`
      insert into tenant_members (tenant_id, user_id, role)
      values (${tenant!.id}, ${userId}, 'owner')`;

    return tenant!.id;
  }) as string;

  await withTenant({ tenantId, role: "owner", userId }, (db) =>
    loadDemoData(db, { tenantId, role: "owner" }),
  );

  return { tenantId, slug, name, expiresAt };
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
 * cascades to its people, and the trigger would write rows referencing the
 * tenant being deleted.
 */
export async function sweepExpiredDemos(): Promise<number> {
  return withAuditTriggersOff(async () => {
    const gone = await owner()<{ id: string }[]>`
      delete from tenants
      where demo_expires_at is not null and demo_expires_at < now()
      returning id`;
    return gone.length;
  });
}
