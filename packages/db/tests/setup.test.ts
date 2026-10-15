/**
 * HRT-367. The setup guide (R22.1, R22.3).
 *
 * Every step is answered by looking at the church's records, so the test worth
 * writing is that doing the work moves the step without anybody telling the
 * guide. A guide with its own idea of progress congratulates a church on
 * importing nobody.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  setupProgress, skipSetupStep, dismissSetup, SETUP_STEPS, SETUP_PHASE_OF,
} from "../src/repo/setup";
import { updateChurch } from "../src/repo/church";
import { createPerson } from "../src/repo/members";
import { addRoom } from "../src/repo/rooms";
import { PermissionError, type TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
const CREATOR = "cccccccc-1111-4111-8111-111111111111";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

/** The guide as a given role reads it. */
const read = (role: TenantRole = "owner") =>
  run((tx) => setupProgress(tx, { tenantId: tenant, role }), role);

const step = (progress: Awaited<ReturnType<typeof setupProgress>>, name: string) =>
  progress.steps.find((row) => row.step === name);

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
    const progress = await read();
    expect(progress.complete).toBe(false);
    expect(progress.settled).toBe(0);
    expect(progress.left).toBe(progress.steps.length);
  });

  it("opens on the first hour", async () => {
    expect((await read()).phase).toBe("basics");
  });

  it("reads them in the order one unblocks the next", async () => {
    expect((await read()).steps.map((row) => row.step)).toEqual([...SETUP_STEPS]);
  });

  it("puts every step in a phase", async () => {
    for (const row of (await read()).steps) {
      expect(row.phase, row.step).toBe(SETUP_PHASE_OF[row.step]);
    }
  });
});

describe("a step nobody in the room can do is not offered (R1.4, R22.1)", () => {
  it("keeps giving away from an administrator, who cannot open it", async () => {
    const mine = (await read("admin")).steps.map((row) => row.step);
    expect(mine).not.toContain("giving");
    expect(mine).not.toContain("funds");
  });

  it("offers it to the owner", async () => {
    const mine = (await read("owner")).steps.map((row) => row.step);
    expect(mine).toContain("giving");
    expect(mine).toContain("funds");
  });
});

describe("doing the work moves the step (R22.1)", () => {
  it("counts an address as the church being written down", async () => {
    await run((tx) => updateChurch(tx, as(), {
      name: "Setup Test Church", timezone: "America/Chicago", addressLine1: "1 Main Street",
    } as never));
    expect(step(await read(), "church")?.done).toBe(true);
  });

  it("counts a service on the calendar", async () => {
    expect(step(await read(), "services")?.done).toBe(false);
    await owner()`
      insert into service_occurrences (tenant_id, slug, name, occurs_on, starts_at)
      values (${tenant}, 'first-service', 'First service', current_date, '10:00')`;
    expect(step(await read(), "services")?.done).toBe(true);
  });

  it("wants somebody beyond whoever made the church", async () => {
    await run((tx) => createPerson(tx, as(), {
      firstName: "First", lastName: "Person", lifecycleStatus: "member",
    } as never));
    /* One member is the person who wrote the church down. A church is two. */
    expect(step(await read(), "members")?.done).toBe(false);

    await run((tx) => createPerson(tx, as(), {
      firstName: "Second", lastName: "Person", lifecycleStatus: "member",
    } as never));
    expect(step(await read(), "members")?.done).toBe(true);
  });

  it("wants a second account, because one is the person who made the church", async () => {
    await owner()`
      insert into app_users (id, email) values (${CREATOR}, 'creator@setuptest.invalid')
      on conflict (id) do nothing`;
    await owner()`
      insert into tenant_members (tenant_id, user_id, role)
      values (${tenant}, ${CREATOR}, 'owner') on conflict do nothing`;

    expect(step(await read(), "team")?.done).toBe(false);

    await owner()`
      insert into invitations (tenant_id, email, role, expires_at)
      values (${tenant}, 'helper@setuptest.invalid', 'admin', now() + interval '14 days')`;

    expect(step(await read(), "team")?.done).toBe(true);
  });

  it("counts a check-in room", async () => {
    expect(step(await read(), "rooms")?.done).toBe(false);
    await run((tx) => addRoom(tx, as(), { name: "Nursery" } as never));
    expect(step(await read(), "rooms")?.done).toBe(true);
  });

  it("counts the portal address being claimed", async () => {
    expect(step(await read(), "portal")?.done).toBe(false);
    await owner()`update tenants set portal_name = 'setuptest' where id = ${tenant}`;
    expect(step(await read(), "portal")?.done).toBe(true);
  });

  it("wants a fund of the church's own, past the two it is given", async () => {
    /* Every church is written down with General and Offering & Tithe. */
    await owner()`
      insert into funds (tenant_id, name, code, position)
      values (${tenant}, 'General', 'GEN', 0), (${tenant}, 'Offering & Tithe', 'OFF', 1)`;
    expect(step(await read(), "funds")?.done).toBe(false);

    await owner()`
      insert into funds (tenant_id, name, code, position)
      values (${tenant}, 'Building', 'BLD', 2)`;
    expect(step(await read(), "funds")?.done).toBe(true);
  });

  it("counts the church's own email account", async () => {
    expect(step(await read(), "email")?.done).toBe(false);
    await owner()`
      insert into church_providers (tenant_id, channel, vendor, state, connected_at)
      values (${tenant}, 'email', 'smtp', 'connected', now())`;
    expect(step(await read(), "email")?.done).toBe(true);
  });

  it("opens the next phase once the first is settled", async () => {
    const progress = await read();
    const basics = progress.steps.filter((row) => row.phase === "basics");
    expect(basics.filter((row) => !row.done && !row.skipped).map((r) => r.step)).toEqual([]);
    expect(progress.phase).not.toBe("basics");
  });
});

describe("skipping (R22.1)", () => {
  it("settles a step a church does not want", async () => {
    await run((tx) => skipSetupStep(tx, as(), "stations"));
    const progress = await read();
    expect(step(progress, "stations")?.skipped).toBe(true);
    expect(step(progress, "stations")?.done).toBe(false);
  });

  it("is undone, because a church changes its mind", async () => {
    await run((tx) => skipSetupStep(tx, as(), "stations", false));
    expect(step(await read(), "stations")?.skipped).toBe(false);
  });

  it("is owner and admin, like everything else about the church", async () => {
    for (const role of ["staff", "pastoral", "member"] as const) {
      await expect(run((tx) => skipSetupStep(tx, as(role), "stations"), role), role)
        .rejects.toBeInstanceOf(PermissionError);
    }
  });
});

describe("putting it away (R22.1)", () => {
  it("is remembered, and does not pretend the work is done", async () => {
    await run((tx) => dismissSetup(tx, as()));
    const progress = await read();
    expect(progress.dismissed).toBe(true);
    expect(progress.complete).toBe(false);
  });

  it("comes back", async () => {
    await run((tx) => dismissSetup(tx, as(), false));
    expect((await read()).dismissed).toBe(false);
  });
});

describe("another church's progress", () => {
  it("is its own", async () => {
    const otherId = await testTenant("setuptest2", "Other Setup Church");
    const theirs = await withTenant({ tenantId: otherId, role: "owner" }, (tx) =>
      setupProgress(tx, { tenantId: otherId, role: "owner" }),
    );
    expect(theirs.settled).toBe(0);
    expect(theirs.complete).toBe(false);
  });
});
