/**
 * HRT-89. A church's groups, for somebody who has never been (R9.5).
 *
 * This is the one place group data leaves the sign-in, so most of the test is
 * about what does not come out: an unlisted group, an archived one, a group at
 * a church nobody has looked at yet, and anything that names a person.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { withTenant, closeConnections, type Tx } from "../src/client";
import { publicChurch, publicGroups, publicGroup } from "../src/repo/public-groups";
import {
  createGroup, updateGroup, setGroupArchived, addToGroup, seedGroupTypes, listGroupTypes,
} from "../src/repo/groups";
import { createPerson } from "../src/repo/members";
import { approveChurch } from "../src/repo/provisional";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let provisional: string;
let open: string;
let hidden: string;
let gone: string;
const SLUG = "publicgroupstest";
const WAITING = "publicgroupswaiting";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

/** R9.1. The kind every group this file writes down is filed under. */
let kind: string;

const group = async (name: string, over: Record<string, unknown> = {}) => {
  const made = await run((tx) =>
    createGroup(tx, as(), { name, typeId: kind, ...over } as never),
  );
  return made.id;
};

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Public Groups Church");
  provisional = await testTenant(WAITING, "Waiting Church", { approved: false });

  await run((tx) => seedGroupTypes(tx, as()));
  kind = (await run((tx) => listGroupTypes(tx)))[0]!.id;

  open = await group("Tuesday evening", {
    description: "Over a meal.",
    dayOfWeek: 2,
    startsAt: "19:30",
    endsAt: "21:00",
    location: "The Hall",
    forWhom: "anyone",
    listed: true,
    openToJoin: true,
  });
  hidden = await group("Leaders", { listed: false });
  gone = await group("Old group", { listed: true });
  await run((tx) => setGroupArchived(tx, as(), gone, true));

  // Somebody in the open group, to prove the count comes out and the name does not.
  const ada = (await run((tx) =>
    createPerson(tx, as(), {
      firstName: "Ada", lastName: "Public", lifecycleStatus: "member",
    } as never),
  )).id;
  await run((tx) => addToGroup(tx, as(), { groupId: open, memberId: ada }));

  // The waiting church has a listed group too, and should still publish nothing.
  await withTenant({ tenantId: provisional, role: "owner" }, async (tx) => {
    await seedGroupTypes(tx, { tenantId: provisional, role: "owner" });
    const [theirs] = await listGroupTypes(tx);
    await createGroup(tx, { tenantId: provisional, role: "owner" }, {
      name: "Should not show", typeId: theirs!.id, listed: true,
    } as never);
  });
});

afterAll(async () => {
  await dropTenants(SLUG, WAITING);
  await closeConnections();
});

describe("the church a public link names", () => {
  it("is found by its slug", async () => {
    expect(await publicChurch(SLUG)).toMatchObject({
      slug: SLUG,
      name: "Public Groups Church",
    });
  });

  it("is nothing for a church nobody has looked at yet", async () => {
    expect(await publicChurch(WAITING)).toBeNull();
    expect(await publicGroups(WAITING)).toEqual([]);
  });

  it("is nothing for a slug that names nothing, or is not a slug", async () => {
    expect(await publicChurch("no-such-church")).toBeNull();
    expect(await publicChurch("../../etc/passwd")).toBeNull();
    expect(await publicChurch("")).toBeNull();
  });

  it("comes back once somebody has looked at it", async () => {
    await withTenant({ tenantId: provisional, role: "owner" }, (tx) =>
      approveChurch(tx, provisional, "a person"),
    );
    expect(await publicChurch(WAITING)).not.toBeNull();
    expect((await publicGroups(WAITING)).map((g) => g.name)).toEqual(["Should not show"]);
  });
});

describe("what the church publishes", () => {
  it("publishes a listed group, with when and where", async () => {
    const found = await publicGroups(SLUG);
    expect(found.map((g) => g.name)).toEqual(["Tuesday evening"]);
    expect(found[0]).toMatchObject({
      dayOfWeek: 2,
      startsAt: "19:30",
      endsAt: "21:00",
      location: "The Hall",
      openToJoin: true,
      memberCount: 1,
    });
  });

  it("publishes a size rather than the members in it", async () => {
    const found = await publicGroups(SLUG);
    const text = JSON.stringify(found);
    expect(text).not.toContain("Ada");
    expect(text).not.toContain("leaders");
  });

  it("leaves out a group the church took off the finder", async () => {
    expect((await publicGroups(SLUG)).map((g) => g.id)).not.toContain(hidden);
  });

  it("leaves out an archived group", async () => {
    expect((await publicGroups(SLUG)).map((g) => g.id)).not.toContain(gone);
  });

  it("follows the church when it unlists one", async () => {
    await run(async (tx) => {
      const current = (await publicGroups(SLUG))[0]!;
      await updateGroup(tx, as(), current.id, { name: current.name, listed: false } as never);
    });
    expect(await publicGroups(SLUG)).toEqual([]);
  });
});

describe("one group by its link", () => {
  it("is found, and only through its own church", async () => {
    await run((tx) =>
      updateGroup(tx, as(), open, { name: "Tuesday evening", listed: true } as never),
    );

    expect(await publicGroup(SLUG, open)).toMatchObject({ name: "Tuesday evening" });
    expect(await publicGroup(WAITING, open)).toBeNull();
  });

  it("is nothing for a group the church does not publish", async () => {
    expect(await publicGroup(SLUG, hidden)).toBeNull();
    expect(await publicGroup(SLUG, "00000000-0000-0000-0000-000000000000")).toBeNull();
  });
});
