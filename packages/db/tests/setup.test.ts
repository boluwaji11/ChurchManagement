/**
 * HRT-105. The setup wizard (R22.1).
 *
 * Every step is answered by looking at the church's records, so the test worth
 * writing is that doing the work moves the step without anybody telling the
 * wizard. A wizard with its own idea of progress congratulates a church on
 * importing nobody.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import { setupProgress, skipSetupStep, dismissSetup } from "../src/repo/setup";
import { updateChurch, addServiceTime } from "../src/repo/church";
import { createPerson } from "../src/repo/members";
import { PermissionError, type TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
const CREATOR = "cccccccc-1111-4111-8111-111111111111";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const step = (progress: Awaited<ReturnType<typeof setupProgress>>, name: string) =>
  progress.steps.find((row) => row.step === name)!;

beforeAll(async () => {
  tenant = await testTenant("setuptest", "Setup Test Church");
});

afterAll(async () => {
  await dropTenants("setuptest");
  await owner()`delete from app_users where id = ${CREATOR}`;
  await closeConnections();
});

describe("a church on its first day (R22.1)", () => {
  it("has everything still to do", async () => {
    const progress = await run((tx) => setupProgress(tx, tenant));
    expect(progress.complete).toBe(false);
    expect(progress.settled).toBe(0);
    expect(progress.steps.map((row) => row.step)).toEqual([
      "church", "services", "members", "team", "rooms",
    ]);
  });
});

describe("doing the work moves the step (R22.1)", () => {
  it("counts an address as the church being written down", async () => {
    await run((tx) => updateChurch(tx, as(), {
      name: "Setup Test Church", timezone: "America/Chicago", addressLine1: "1 Main Street",
    } as never));
    expect(step(await run((tx) => setupProgress(tx, tenant)), "church").done).toBe(true);
  });

  it("counts a service time", async () => {
    await run((tx) => addServiceTime(tx, as(), {
      name: "Sunday", dayOfWeek: 0, startsAt: "10:00",
    } as never));
    expect(step(await run((tx) => setupProgress(tx, tenant)), "services").done).toBe(true);
  });

  it("counts one person, however they arrived", async () => {
    await run((tx) => createPerson(tx, as(), {
      firstName: "First", lastName: "Person", lifecycleStatus: "member",
    } as never));
    expect(step(await run((tx) => setupProgress(tx, tenant)), "members").done).toBe(true);
  });

  it("wants a second account, because one is the person who made the church", async () => {
    // The church's own owner, as createChurch would have left it.
    await owner()`
      insert into app_users (id, email) values (${CREATOR}, 'creator@setuptest.invalid')
      on conflict (id) do nothing`;
    await owner()`
      insert into tenant_members (tenant_id, user_id, role)
      values (${tenant}, ${CREATOR}, 'owner') on conflict do nothing`;

    expect(step(await run((tx) => setupProgress(tx, tenant)), "team").done).toBe(false);

    await owner()`
      insert into invitations (tenant_id, email, role, expires_at)
      values (${tenant}, 'helper@setuptest.invalid', 'admin', now() + interval '14 days')`;

    expect(step(await run((tx) => setupProgress(tx, tenant)), "team").done).toBe(true);
  });
});

describe("skipping (R22.1)", () => {
  it("settles a step a church does not want", async () => {
    await run((tx) => skipSetupStep(tx, as(), "rooms"));
    const progress = await run((tx) => setupProgress(tx, tenant));
    expect(step(progress, "rooms").skipped).toBe(true);
    expect(step(progress, "rooms").done).toBe(false);
    expect(progress.complete).toBe(true);
  });

  it("is undone, because a church changes its mind", async () => {
    await run((tx) => skipSetupStep(tx, as(), "rooms", false));
    expect((await run((tx) => setupProgress(tx, tenant))).complete).toBe(false);
  });

  it("is owner and admin, like everything else about the church", async () => {
    for (const role of ["staff", "pastoral", "member"] as const) {
      await expect(run((tx) => skipSetupStep(tx, as(role), "rooms"), role), role)
        .rejects.toBeInstanceOf(PermissionError);
    }
  });
});

describe("putting it away (R22.1)", () => {
  it("is remembered, and does not pretend the work is done", async () => {
    await run((tx) => dismissSetup(tx, as()));
    const progress = await run((tx) => setupProgress(tx, tenant));
    expect(progress.dismissed).toBe(true);
    expect(progress.complete).toBe(false);
  });

  it("comes back", async () => {
    await run((tx) => dismissSetup(tx, as(), false));
    expect((await run((tx) => setupProgress(tx, tenant))).dismissed).toBe(false);
  });
});

describe("another church's progress", () => {
  it("is its own", async () => {
    const otherId = await testTenant("setuptest2", "Other Setup Church");
    const theirs = await withTenant({ tenantId: otherId, role: "owner" }, (tx) =>
      setupProgress(tx, otherId),
    );
    expect(theirs.settled).toBe(0);
    await dropTenants("setuptest2");
  });
});
