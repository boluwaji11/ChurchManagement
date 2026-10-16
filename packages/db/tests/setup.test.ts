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
import { publishSite, startSite } from "../src/repo/church-site";
import { PermissionError, type TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
const CREATOR = "cccccccc-1111-4111-8111-111111111111";
const READER = "cccccccc-2222-4222-8222-222222222222";

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
  await owner()`delete from app_users where id in (${CREATOR}, ${READER})`;
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

  it("wants a role taken up off the shelf, because a new church runs only Owner", async () => {
    /* R1.6. Every church is written down with Owner live and the other eight
       built-ins archived, so there is nothing to invite anybody as yet. */
    await owner()`
      insert into tenant_roles (tenant_id, key, name, builtin, archived_at)
      values (${tenant}, 'owner', 'Owner', true, null)
      on conflict do nothing`;
    await owner()`
      insert into tenant_roles (tenant_id, key, name, builtin, archived_at)
      values (${tenant}, 'staff', 'Staff', true, now())
      on conflict do nothing`;
    expect(step(await read(), "roles")?.done).toBe(false);

    await owner()`
      update tenant_roles set archived_at = null
       where tenant_id = ${tenant} and key = 'staff'`;
    expect(step(await read(), "roles")?.done).toBe(true);
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

  it("counts the website being on the internet, rather than a draft", async () => {
    expect(step(await read(), "website")?.done).toBe(false);

    await run((tx) => startSite(tx, as(), {
      template: "gathering",
      homeId: "home",
      pages: [{
        id: "home", title: "Home", slug: "", inNav: true, seo: {},
        sections: [{
          id: "hero", type: "hero", variant: "split", content: { title: "Welcome" },
        }],
      }],
    }));
    /* A draft is work in progress, so the step stays open until it is out. */
    expect(step(await read(), "website")?.done).toBe(false);

    await run((tx) => publishSite(tx, as()));
    expect(step(await read(), "website")?.done).toBe(true);
  });

  it("counts the reader's own record being filled in", async () => {
    /* The one step here that is about the person rather than the church, so
       it is the one that needs to know who is reading. */
    const whose = (userId?: string) =>
      run((tx) => setupProgress(tx, { tenantId: tenant, role: "owner", userId }));

    await owner()`
      insert into app_users (id, email) values (${READER}, 'reader@setuptest.invalid')
      on conflict (id) do nothing`;
    const [person] = await owner()<{ id: string }[]>`
      insert into members (tenant_id, slug, first_name, last_name, app_user_id, lifecycle_status)
      values (${tenant}, 'reader-person', 'Reader', 'Person', ${READER}, 'member') returning id`;

    expect(step(await whose(READER), "profile")?.done).toBe(false);

    await owner()`
      insert into contact_methods (tenant_id, member_id, kind, value)
      values (${tenant}, ${person!.id}, 'phone', '+15550000000')`;
    expect(step(await whose(READER), "profile")?.done).toBe(true);

    /* R2.4. An address counts as well: the step asks for a record somebody
       can be recognised and reached by, and the form asks for more than a
       number. */
    await owner()`delete from contact_methods where member_id = ${person!.id}`;
    expect(step(await whose(READER), "profile")?.done).toBe(false);

    await owner()`
      insert into addresses (tenant_id, member_id, line1)
      values (${tenant}, ${person!.id}, '1 Main Street')`;
    expect(step(await whose(READER), "profile")?.done).toBe(true);
  });

  it("opens the next phase once the first is settled", async () => {
    /* Their own record is about whoever is reading, and these read as nobody. */
    await run((tx) => skipSetupStep(tx, as(), "profile"));

    const progress = await read();
    const basics = progress.steps.filter((row) => row.phase === "basics");
    expect(basics.filter((row) => !row.done && !row.skipped).map((r) => r.step)).toEqual([]);
    expect(progress.phase).not.toBe("basics");

    await run((tx) => skipSetupStep(tx, as(), "profile", false));
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
