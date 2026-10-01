/**
 * HRT-83. Groups: types, the record, leaders and the roster (R9.1 to R9.4).
 *
 * The thing this has to get right is the history. A church that loses the
 * record of who was in a group last year has lost the only evidence it has of
 * how somebody was discipled, so leaving is a date and never a deletion.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import {
  listGroupTypes, addGroupType, seedGroupTypes, DEFAULT_GROUP_TYPES,
  createGroup, updateGroup, listGroups, getGroup, setGroupArchived,
  addToGroup, removeFromGroup, groupRoster, groupsForPerson, groupsLedBy,
  canManageGroups, GROUP_ROLES,
} from "../src/repo/groups";
import { createPerson } from "../src/repo/people";
import { InvalidInputError, NameTakenError } from "../src/errors";
import { PermissionError, TENANT_ROLES, type TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let smallGroup: string;
let ruth: string;
let sam: string;
let joy: string;

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

beforeAll(async () => {
  tenant = await testTenant("grouptest", "Group Test Church");
  await run((tx) => seedGroupTypes(tx, as()));

  const types = await run((tx) => listGroupTypes(tx));
  smallGroup = types.find((t) => t.name === "Small group")!.id;

  const people = await Promise.all(
    ["Ruth", "Sam", "Joy"].map((firstName) =>
      run((tx) =>
        createPerson(tx, as(), {
          firstName, lastName: "Grouptest", lifecycleStatus: "member",
        } as never),
      ),
    ),
  );
  [ruth, sam, joy] = people.map((p) => p.id) as [string, string, string];
});

afterAll(async () => {
  await dropTenants("grouptest");
  await closeConnections();
});

describe("group types (R9.1)", () => {
  it("starts a church with five it can rename", async () => {
    const types = await run((tx) => listGroupTypes(tx));
    expect(types.map((t) => t.name)).toEqual(DEFAULT_GROUP_TYPES.map((t) => t.name));
  });

  it("takes another one, and refuses a name already in use", async () => {
    const added = await run((tx) => addGroupType(tx, as(), { name: "Prayer chain", hue: "rose" }));
    expect(added.name).toBe("Prayer chain");

    await expect(run((tx) => addGroupType(tx, as(), { name: "prayer chain" })))
      .rejects.toBeInstanceOf(NameTakenError);
    await expect(run((tx) => addGroupType(tx, as(), { name: "  " })))
      .rejects.toBeInstanceOf(InvalidInputError);
  });

  it("does not seed twice", async () => {
    const before = await run((tx) => listGroupTypes(tx));
    await run((tx) => seedGroupTypes(tx, as()));
    const after = await run((tx) => listGroupTypes(tx));
    expect(after.length).toBe(before.length);
  });
});

describe("the record (R9.2)", () => {
  it("keeps what a church says about a group", async () => {
    const group = await run((tx) => createGroup(tx, as(), {
      name: "Tuesday night",
      description: "A small group in the Hall.",
      typeId: smallGroup,
      dayOfWeek: 2,
      startsAt: "19:00",
      frequency: "weekly",
      location: "The Hall",
      capacity: 12,
    }));

    expect(group.name).toBe("Tuesday night");
    expect(group.typeName).toBe("Small group");
    expect(group.dayOfWeek).toBe(2);
    expect(group.startsAt).toBe("19:00");
    expect(group.frequency).toBe("weekly");
    expect(group.location).toBe("The Hall");
    expect(group.capacity).toBe(12);
    expect(group.openToJoin).toBe(true);
    expect(group.memberCount).toBe(0);
  });

  it("takes a group with no pattern at all", async () => {
    const group = await run((tx) => createGroup(tx, as(), { name: "Prayer, when it suits" }));
    expect(group.dayOfWeek).toBeNull();
    expect(group.startsAt).toBeNull();
    expect(group.frequency).toBeNull();
  });

  it("refuses what it cannot store honestly", async () => {
    await expect(run((tx) => createGroup(tx, as(), { name: "" })))
      .rejects.toBeInstanceOf(InvalidInputError);
    await expect(run((tx) => createGroup(tx, as(), { name: "Bad day", dayOfWeek: 9 })))
      .rejects.toBeInstanceOf(InvalidInputError);
    await expect(run((tx) => createGroup(tx, as(), { name: "Bad time", startsAt: "7pm" })))
      .rejects.toBeInstanceOf(InvalidInputError);
    await expect(run((tx) => createGroup(tx, as(), { name: "Bad often", frequency: "sometimes" })))
      .rejects.toBeInstanceOf(InvalidInputError);
    await expect(run((tx) => createGroup(tx, as(), { name: "Bad size", capacity: 0 })))
      .rejects.toBeInstanceOf(InvalidInputError);
  });

  it("refuses a second group with the same name", async () => {
    await expect(run((tx) => createGroup(tx, as(), { name: "tuesday night" })))
      .rejects.toBeInstanceOf(NameTakenError);
  });

  it("is changed, including back to having no pattern", async () => {
    const [group] = await run((tx) => listGroups(tx, { typeId: smallGroup }));
    const changed = await run((tx) => updateGroup(tx, as(), group!.id, {
      name: "Tuesday night", location: "The Annexe", dayOfWeek: null, startsAt: null,
    }));
    expect(changed.location).toBe("The Annexe");
    expect(changed.dayOfWeek).toBeNull();
  });

  it("is managed by staff and up, and by nobody else", () => {
    const allowed = TENANT_ROLES.filter((role) => canManageGroups(role));
    expect([...allowed]).toEqual(["owner", "admin", "staff", "pastoral"]);
  });

  it("refuses a member at the query layer", async () => {
    await expect(run((tx) => createGroup(tx, as("member"), { name: "Mine" }), "member"))
      .rejects.toBeInstanceOf(PermissionError);
  });
});

describe("the roster (R9.3, R9.4)", () => {
  let group: string;

  beforeAll(async () => {
    group = (await run((tx) => createGroup(tx, as(), {
      name: "Wednesday men", typeId: smallGroup, dayOfWeek: 3, startsAt: "06:30",
    }))).id;
  });

  it("has three roles and no more", () => {
    expect([...GROUP_ROLES]).toEqual(["leader", "coleader", "member"]);
  });

  it("puts the leaders at the top", async () => {
    await run((tx) => addToGroup(tx, as(), { groupId: group, personId: sam }));
    await run((tx) => addToGroup(tx, as(), { groupId: group, personId: ruth, role: "leader" }));
    const roster = await run((tx) => addToGroup(tx, as(), {
      groupId: group, personId: joy, role: "coleader",
    }));

    expect(roster.map((m) => m.name)).toEqual([
      "Ruth Grouptest", "Joy Grouptest", "Sam Grouptest",
    ]);
  });

  it("counts the live members and names the leaders on the group itself", async () => {
    const row = await run((tx) => getGroup(tx, group));
    expect(row!.memberCount).toBe(3);
    expect(row!.leaders.map((l) => l.name)).toEqual(["Joy Grouptest", "Ruth Grouptest"]);
  });

  it("joining twice is the same join, with the role moved", async () => {
    const roster = await run((tx) => addToGroup(tx, as(), {
      groupId: group, personId: sam, role: "coleader",
    }));
    expect(roster.filter((m) => m.personId === sam).length).toBe(1);
    expect(roster.find((m) => m.personId === sam)!.role).toBe("coleader");
  });

  it("leaving keeps the row, with the day they went", async () => {
    const roster = await run((tx) => removeFromGroup(tx, as(), {
      groupId: group, personId: sam, leftOn: "2026-09-01",
    }));
    expect(roster.map((m) => m.personId)).not.toContain(sam);

    const full = await run((tx) => groupRoster(tx, group, { includePast: true }));
    const gone = full.find((m) => m.personId === sam)!;
    expect(gone.leftOn).toBe("2026-09-01");
    expect(gone.joinedOn).not.toBeNull();
  });

  it("lets somebody come back, as a second row rather than a rewrite", async () => {
    await run((tx) => addToGroup(tx, as(), { groupId: group, personId: sam, joinedOn: "2026-09-15" }));
    const full = await run((tx) => groupRoster(tx, group, { includePast: true }));
    expect(full.filter((m) => m.personId === sam).length).toBe(2);
  });

  it("refuses somebody who is not on the record", async () => {
    await expect(run((tx) => addToGroup(tx, as(), {
      groupId: group, personId: "00000000-0000-0000-0000-000000000000",
    }))).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("says which groups somebody is in now", async () => {
    const theirs = await run((tx) => groupsForPerson(tx, ruth));
    expect(theirs.map((g) => g.name)).toContain("Wednesday men");
    expect(theirs.find((g) => g.name === "Wednesday men")!.role).toBe("leader");
  });

  it("says which groups somebody leads, which is what scopes what they see", async () => {
    // R9.3 is built on this: a leader and a co-leader both lead.
    const led = await run((tx) => groupsLedBy(tx, ruth));
    expect(led).toContain(group);

    const theirs = await run((tx) => groupsLedBy(tx, sam));
    expect(theirs).toEqual([]);
  });
});

describe("archiving (R9.2)", () => {
  it("takes the group off the list and keeps its roster", async () => {
    const group = await run((tx) => createGroup(tx, as(), { name: "Finished course" }));
    await run((tx) => addToGroup(tx, as(), { groupId: group.id, personId: joy }));

    await run((tx) => setGroupArchived(tx, as(), group.id, true));

    const open = await run((tx) => listGroups(tx));
    expect(open.map((g) => g.name)).not.toContain("Finished course");

    const all = await run((tx) => listGroups(tx, { includeArchived: true }));
    expect(all.map((g) => g.name)).toContain("Finished course");

    const roster = await run((tx) => groupRoster(tx, group.id));
    expect(roster.map((m) => m.personId)).toContain(joy);

    // And it is not one of the groups the person is shown as being in.
    const theirs = await run((tx) => groupsForPerson(tx, joy));
    expect(theirs.map((g) => g.name)).not.toContain("Finished course");
  });
});

describe("another church's groups", () => {
  it("are never returned", async () => {
    const otherId = await testTenant("grouptest2", "Other Group Church");
    const theirs = await withTenant({ tenantId: otherId, role: "owner" }, (tx) => listGroups(tx));
    expect(theirs).toEqual([]);
    await dropTenants("grouptest2");
  });
});
