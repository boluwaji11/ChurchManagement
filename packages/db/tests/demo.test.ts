/**
 * HRT-31. A demo church, loadable and removable (R19.7).
 *
 * Time to value is the metric this serves, so the checks are that it arrives
 * complete and leaves completely, and that leaving takes nothing the church
 * added itself.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import { loadDemoData, removeDemoData, demoState } from "../src/demo/load";
import { DEMO_PEOPLE } from "../src/demo/people";
import { listPeople, createPerson } from "../src/repo/people";
import { listTagsWithCounts } from "../src/repo/tags";
import { listRelationships } from "../src/repo/relationships";
import { listMilestones } from "../src/repo/milestones";
import { InvalidInputError } from "../src/errors";
import { PermissionError, type TenantRole } from "../src/roles";
import { withAuditTriggersOff } from "../src/maintenance";

let tenant: string;

const as = (tenantId: string, role: TenantRole = "owner") => ({ tenantId, role });
const run = <T>(tenantId: string, role: TenantRole, work: (tx: Tx) => Promise<T>) =>
  withTenant({ tenantId, role }, work);

/**
 * A church of this suite's own.
 *
 * Loading and removing twenty-one people is the loudest thing in the suite, and
 * the files run side by side. Borrowing a seeded church means another test can
 * read a person in the moment this one deletes them, which is a failure that
 * looks like an isolation bug and is not.
 */
beforeAll(async () => {
  const [row] = await owner()<{ id: string }[]>`
    insert into tenants (slug, name, timezone)
    values ('demotest', 'Demo Test Church', 'America/Chicago')
    returning id`;
  tenant = row!.id;
});

afterAll(async () => {
  await withAuditTriggersOff(async () => {
    await owner()`delete from tenants where id = ${tenant}`;
  });
  await closeConnections();
});

describe("loading", () => {
  it("brings the whole church, with its households, tags, milestones and relationships", async () => {
    const before = (await run(tenant, "owner", (tx) => listPeople(tx))).length;
    const state = await run(tenant, "owner", (tx) => loadDemoData(tx, as(tenant)));

    expect(state.loaded).toBe(true);
    expect(state.people).toBe(DEMO_PEOPLE.length);

    const rows = await run(tenant, "owner", (tx) => listPeople(tx));
    expect(rows.length).toBe(before + DEMO_PEOPLE.length);

    // Households arrive, and the second person in one joins the first rather
    // than starting a second household with the same name.
    const harrisons = rows.filter((r) => r.householdName === "Harrison");
    expect(harrisons.length).toBe(5);

    const tags = await run(tenant, "owner", (tx) => listTagsWithCounts(tx));
    expect(tags.map((t) => t.name)).toContain("Choir");

    const daniel = rows.find((r) => r.firstName === "Daniel" && r.lastName === "Harrison")!;
    expect((await run(tenant, "owner", (tx) => listMilestones(tx, daniel.id))).length).toBe(2);

    // Rebecca is Daniel's spouse, so the inverse was written on her record.
    const rebecca = rows.find((r) => r.firstName === "Rebecca")!;
    const hers = await run(tenant, "owner", (tx) => listRelationships(tx, rebecca.id));
    expect(hers.some((r) => r.kind === "spouse" && r.relatedName.startsWith("Daniel"))).toBe(true);

    // Caleb has two parents, and each of them has him as a child.
    const caleb = rows.find((r) => r.firstName === "Caleb")!;
    const his = await run(tenant, "owner", (tx) => listRelationships(tx, caleb.id));
    expect(his.filter((r) => r.kind === "parent").length).toBe(2);
  });

  it("refuses to load twice", async () => {
    await expect(
      run(tenant, "owner", (tx) => loadDemoData(tx, as(tenant))),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("is Owner and Admin", async () => {
    await expect(
      run(tenant, "staff", (tx) => loadDemoData(tx, as(tenant, "staff"))),
    ).rejects.toBeInstanceOf(PermissionError);
    await expect(
      run(tenant, "staff", (tx) => removeDemoData(tx, as(tenant, "staff"))),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});

describe("removing", () => {
  it("takes the demo church and leaves everything else", async () => {
    // Somebody the church added while the demo was loaded.
    const theirs = await run(tenant, "owner", (tx) =>
      createPerson(tx, as(tenant), {
        firstName: "Ourown", lastName: "Personhere", lifecycleStatus: "member",
      } as never),
    );

    const removed = await run(tenant, "owner", (tx) => removeDemoData(tx, as(tenant)));
    expect(removed.people).toBe(DEMO_PEOPLE.length);
    expect(removed.tags).toBe(5);

    const rows = await run(tenant, "owner", (tx) => listPeople(tx));
    expect(rows.some((r) => r.id === theirs.id)).toBe(true);
    expect(rows.some((r) => r.lastName === "Harrison")).toBe(false);

    const tags = await run(tenant, "owner", (tx) => listTagsWithCounts(tx));
    expect(tags.map((t) => t.name)).not.toContain("Choir");

    expect((await run(tenant, "owner", (tx) => demoState(tx))).loaded).toBe(false);

    await owner()`delete from people where id = ${theirs.id}`;
  });

  it("can be loaded again afterwards", async () => {
    const state = await run(tenant, "owner", (tx) => loadDemoData(tx, as(tenant)));
    expect(state.people).toBe(DEMO_PEOPLE.length);
  });
});
