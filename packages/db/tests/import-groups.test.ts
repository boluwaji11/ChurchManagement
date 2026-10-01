/**
 * HRT-116. Bringing a church's groups across (R19.5, R9.5).
 *
 * A group file is one line per person per group. The hard part is finding the
 * person, so most of this is about what happens when the file names somebody
 * the directory cannot identify with certainty: it fails the row rather than
 * guessing, because the wrong Sarah in a small group is a mistake a church will
 * not notice and cannot see.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import { readSheet } from "../src/import/csv";
import { isGroupSheet, guessGroupMapping, parseGroupRole } from "../src/import/group-columns";
import { planGroups, commitGroups, rollbackGroupImport } from "../src/import/run-groups";
import { createPerson } from "../src/repo/people";
import { groupRoster, listGroups, seedGroupTypes, createGroup, addToGroup } from "../src/repo/groups";
import { PermissionError, type TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
const SLUG = "grouptest";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const HEAD = "Group Name,Group Type,First Name,Last Name,Email,Role,Joined";

async function importGroups(body: string, role: TenantRole = "owner") {
  const sheet = readSheet(`${HEAD}\n${body}`);
  const plan = await run((tx) =>
    planGroups(tx, { filename: "groups.csv", sheet, mapping: guessGroupMapping(sheet.headers) }),
  );
  const result = await run((tx) => commitGroups(tx, as(role), plan), role);
  return { plan, result };
}

const named = async (name: string) => {
  const all = await run((tx) => listGroups(tx, {}));
  return all.find((group) => group.name === name);
};

beforeAll(async () => {
  tenant = await testTenant(SLUG, "Group Import Church");
  await run((tx) => seedGroupTypes(tx, as()));

  const make = (firstName: string, lastName: string, email?: string) =>
    run((tx) =>
      createPerson(tx, as(), {
        firstName, lastName, lifecycleStatus: "member",
        ...(email ? { email } : {}),
      } as never),
    );

  await make("Maria", "Alvarez", "maria@grouptest.invalid");
  await make("Carlos", "Alvarez", "carlos@grouptest.invalid");
  await make("Ruth", "Mensah", "ruth@grouptest.invalid");
  // Two people with one name and no address between them, which is the case
  // that must never be guessed.
  await make("Sam", "Twin");
  await make("Sam", "Twin");
});

afterAll(async () => {
  await dropTenants(SLUG);
  await closeConnections();
});

describe("recognising a group file", () => {
  it("knows memberships from people", () => {
    expect(isGroupSheet(["Group Name", "First Name", "Last Name", "Email"])).toBe(true);
    expect(isGroupSheet(["Team", "Email", "Role"])).toBe(true);
    expect(isGroupSheet(["First Name", "Last Name", "Email", "Household"])).toBe(false);
  });

  it("does not read a people file's Type column as a group", () => {
    // Reading this as a group file puts the whole church into a group called
    // "Member".
    expect(isGroupSheet(["First Name", "Last Name", "Type", "Status"])).toBe(false);
  });

  it("matches the headers all three systems write", () => {
    const mapping = guessGroupMapping(["GroupName", "FirstName", "LastName", "Email", "GroupRole"]);
    expect(mapping["GroupName"]).toBe("groupName");
    expect(mapping["GroupRole"]).toBe("role");
    expect(mapping["FirstName"]).toBe("firstName");
  });
});

describe("what each system calls a leader", () => {
  it("reads the words they use", () => {
    expect(parseGroupRole("Leader")).toBe("leader");
    expect(parseGroupRole("Host")).toBe("leader");
    expect(parseGroupRole("Co-Leader")).toBe("coleader");
    expect(parseGroupRole("Assistant Leader")).toBe("coleader");
    expect(parseGroupRole("Member")).toBe("member");
    expect(parseGroupRole("")).toBe("member");
  });

  it("reads a yes in a column called Leader", () => {
    expect(parseGroupRole("Yes")).toBe("leader");
  });
});

describe("importing", () => {
  it("creates the group named by the first row and puts everyone in it", async () => {
    const { plan, result } = await importGroups(
      `Tuesday Night,Small group,Maria,Alvarez,maria@grouptest.invalid,Leader,2023-02-01\n` +
      `Tuesday Night,Small group,Carlos,Alvarez,carlos@grouptest.invalid,Member,2023-02-01\n`,
    );

    expect(plan.newGroups).toEqual(["Tuesday Night"]);
    expect(result.groupsCreated).toBe(1);
    expect(result.joined).toBe(2);

    const group = await named("Tuesday Night");
    const roster = await run((tx) => groupRoster(tx, group!.id));
    expect(roster).toHaveLength(2);
    expect(roster.find((m) => m.name.includes("Maria"))?.role).toBe("leader");
    expect(roster.find((m) => m.name.includes("Carlos"))?.role).toBe("member");
  });

  it("puts the type on the group it created", async () => {
    const group = await named("Tuesday Night");
    expect(group?.typeName).toBe("Small group");
  });

  it("keeps the date somebody joined", async () => {
    const group = await named("Tuesday Night");
    const roster = await run((tx) => groupRoster(tx, group!.id));
    expect(roster[0]?.joinedOn).toBe("2023-02-01");
  });

  it("joins an existing group rather than making a second one", async () => {
    await importGroups(`Tuesday Night,,Ruth,Mensah,ruth@grouptest.invalid,Member,\n`);
    const all = await run((tx) => listGroups(tx, {}));
    expect(all.filter((group) => group.name === "Tuesday Night")).toHaveLength(1);
  });

  it("leaves somebody who is already in with that role alone", async () => {
    const { plan } = await importGroups(
      `Tuesday Night,,Maria,Alvarez,maria@grouptest.invalid,Leader,\n`,
    );
    expect(plan.totals.skip).toBe(1);
    expect(plan.rows[0]?.reason).toBe("import.group.alreadyIn");
  });
});

describe("a row it cannot be sure about", () => {
  it("fails rather than guessing between two people of the same name", async () => {
    const { plan } = await importGroups(`Prayer,,Sam,Twin,,Member,\n`);
    expect(plan.totals.fail).toBe(1);
    expect(plan.rows[0]?.reason).toBe("import.group.ambiguous");
  });

  it("fails when the person is not in the directory at all", async () => {
    const { plan } = await importGroups(`Prayer,,Nobody,Here,nobody@grouptest.invalid,Member,\n`);
    expect(plan.rows[0]?.outcome).toBe("fail");
    expect(plan.rows[0]?.reason).toBe("import.group.noMatch");
  });

  it("fails a row with no group on it, and one with no person on it", async () => {
    const { plan } = await importGroups(
      `,,Maria,Alvarez,maria@grouptest.invalid,Member,\n` +
      `Prayer,,,,,Member,\n`,
    );
    expect(plan.rows[0]?.reason).toBe("import.group.noName");
    expect(plan.rows[1]?.reason).toBe("import.group.noPerson");
  });

  it("fails a joined date that is not a date, rather than dropping it", async () => {
    const { plan } = await importGroups(
      `Prayer,,Ruth,Mensah,ruth@grouptest.invalid,Member,sometime last year\n`,
    );
    expect(plan.rows[0]?.reason).toBe("import.group.badDate");
  });

  it("makes no group for a row that failed", async () => {
    expect(await named("Prayer")).toBeUndefined();
  });
});

describe("undoing it (R19.4)", () => {
  it("takes the people back out and archives the group it made", async () => {
    const { result } = await importGroups(
      `Thursday Prayer,,Maria,Alvarez,maria@grouptest.invalid,Leader,\n` +
      `Thursday Prayer,,Ruth,Mensah,ruth@grouptest.invalid,Member,\n`,
    );
    const group = await named("Thursday Prayer");
    expect(group).toBeTruthy();

    const undone = await run((tx) => rollbackGroupImport(tx, as(), result.batchId));
    expect(undone.left).toBe(2);
    expect(undone.groupsArchived).toBe(1);

    expect(await named("Thursday Prayer")).toBeUndefined();
    expect(await run((tx) => groupRoster(tx, group!.id))).toHaveLength(0);
  });

  it("keeps a group somebody else has joined since", async () => {
    const { result } = await importGroups(
      `Saturday Workday,,Maria,Alvarez,maria@grouptest.invalid,Leader,\n`,
    );
    const group = await named("Saturday Workday");

    const [carlos] = await owner()<{ id: string }[]>`
      select id from people where tenant_id = ${tenant} and first_name = 'Carlos'`;
    await run((tx) => addToGroup(tx, as(), { groupId: group!.id, personId: carlos!.id }));

    const undone = await run((tx) => rollbackGroupImport(tx, as(), result.batchId));
    expect(undone.groupsArchived).toBe(0);
    expect(undone.groupsKept).toBe(1);
    expect(await named("Saturday Workday")).toBeTruthy();
  });

  it("leaves a group the church already had exactly where it was", async () => {
    const existing = await run((tx) => createGroup(tx, as(), { name: "Already Ours" }));
    const { result } = await importGroups(
      `Already Ours,,Ruth,Mensah,ruth@grouptest.invalid,Member,\n`,
    );
    await run((tx) => rollbackGroupImport(tx, as(), result.batchId));
    expect(await named("Already Ours")).toBeTruthy();
    expect(existing.id).toBe((await named("Already Ours"))!.id);
  });
});

describe("who may do it", () => {
  it("is refused to a role that does not run groups", async () => {
    const sheet = readSheet(`${HEAD}\nX,,Ruth,Mensah,ruth@grouptest.invalid,Member,\n`);
    const plan = await run((tx) =>
      planGroups(tx, { filename: "groups.csv", sheet, mapping: guessGroupMapping(sheet.headers) }),
    );
    await expect(
      run((tx) => commitGroups(tx, as("checkin_volunteer"), plan), "checkin_volunteer"),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});
