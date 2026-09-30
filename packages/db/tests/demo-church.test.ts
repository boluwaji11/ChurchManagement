/**
 * HRT-46. A demo church, belonging to nobody (R19.7, R22.1).
 *
 * The point of building it this way is that invented people can never land in a
 * real church's directory. The tests that matter are the ones proving the demo
 * is a separate church, and that it goes away.
 */
import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { owner, withTenant, closeConnections } from "../src/client";
import { createDemoChurch, demoChurchInfo, sweepExpiredDemos } from "../src/demo/church";
import { DEMO_PEOPLE } from "../src/demo/people";
import { listPeople } from "../src/repo/people";
import { withAuditTriggersOff } from "../src/maintenance";

const made: string[] = [];

afterAll(async () => {
  await withAuditTriggersOff(async () => {
    await owner()`delete from tenants where slug like 'demo-%'`;
    await owner()`delete from app_users where email like '%@demo.invalid'`;
  });
  await closeConnections();
});

describe("a demo church", () => {
  it("arrives full, and belongs to the visitor who asked for it", async () => {
    const userId = randomUUID();
    const demo = await createDemoChurch(userId);
    made.push(demo.tenantId);

    expect(demo.slug.startsWith("demo-")).toBe(true);
    expect(demo.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const people = await withTenant(
      { tenantId: demo.tenantId, role: "owner", userId },
      (tx) => listPeople(tx),
    );
    expect(people.length).toBe(DEMO_PEOPLE.length);

    const info = await demoChurchInfo(demo.tenantId);
    expect(info.isDemo).toBe(true);
  });

  it("is its own church every time, so one visitor cannot touch another's", async () => {
    const a = await createDemoChurch(randomUUID());
    const b = await createDemoChurch(randomUUID());
    made.push(a.tenantId, b.tenantId);

    expect(a.tenantId).not.toBe(b.tenantId);
    expect(a.slug).not.toBe(b.slug);

    // The isolation suite proves this in general. Here it proves that the demo
    // did not reuse a church somebody else is already looking at.
    const rows = await owner()<{ n: string }[]>`
      select count(*)::text as n from tenant_members where tenant_id = ${a.tenantId}`;
    expect(Number(rows[0]!.n)).toBe(1);
  });

  it("is not marked on a real church", async () => {
    const [riverside] = await owner()<{ id: string }[]>`
      select id from tenants where slug = 'riverside'`;
    expect((await demoChurchInfo(riverside!.id)).isDemo).toBe(false);
  });
});

describe("expiry", () => {
  it("sweeps the ones that have run out and leaves the rest", async () => {
    const stale = await createDemoChurch(randomUUID());
    const fresh = await createDemoChurch(randomUUID());
    made.push(stale.tenantId, fresh.tenantId);

    await owner()`
      update tenants set demo_expires_at = now() - interval '1 hour'
      where id = ${stale.tenantId}`;

    await sweepExpiredDemos();

    const left = await owner()<{ id: string }[]>`
      select id from tenants where id in (${stale.tenantId}, ${fresh.tenantId})`;
    expect(left.map((r) => r.id)).toEqual([fresh.tenantId]);
  });

  it("never sweeps a church that is not a demo", async () => {
    const before = await owner()<{ n: string }[]>`
      select count(*)::text as n from tenants where demo_expires_at is null`;
    await sweepExpiredDemos();
    const after = await owner()<{ n: string }[]>`
      select count(*)::text as n from tenants where demo_expires_at is null`;
    expect(after[0]!.n).toBe(before[0]!.n);
  });
});
