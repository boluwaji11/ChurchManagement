/**
 * HRT-84. A group leader sees their own group and nothing else (R9.3).
 *
 * The acceptance criterion is adversarial on purpose: a group leader querying
 * the members API receives only members of groups they lead, with no giving data
 * and no confidential notes. So these tests ask the query layer directly rather
 * than through a page, and they try the ways somebody would get past it.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import { listPeople, countPeople, getPerson, createPerson } from "../src/repo/members";
import {
  createGroup, addToGroup, removeFromGroup, seedGroupTypes, listGroupTypes,
} from "../src/repo/groups";
import { visiblePeople, personForUser, linkPersonToUser, canSeePerson } from "../src/repo/scope";
import { canReadConfidentialNotes } from "../src/roles";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let group: string;
let leader: string;
let member: string;
let stranger: string;
const leaderUser = "11111111-1111-4111-8111-111111111111";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const viewer = { role: "group_leader" as TenantRole, userId: leaderUser };

/** R9.1. A kind for the groups these tests write down. */
let aKind: string;

beforeAll(async () => {
  tenant = await testTenant("scopetest", "Scope Test Church");
  await run((tx) => seedGroupTypes(tx, as()));
  /* R9.1. Every group is one of the kinds the church keeps. */
  aKind = (await run((tx) => listGroupTypes(tx)))[0]!.id;

  await owner()`
    insert into app_users (id, email, full_name)
    values (${leaderUser}, 'leader@scopetest.invalid', 'Ruth Leader')
    on conflict (id) do nothing`;

  const make = async (firstName: string) =>
    (await run((tx) =>
      createPerson(tx, as(), {
        firstName, lastName: "Scopetest", lifecycleStatus: "member",
      } as never),
    )).id;

  leader = await make("Ruth");
  member = await make("Sam");
  stranger = await make("Joy");

  await run((tx) => linkPersonToUser(tx, leader, leaderUser));

  group = (await run((tx) => createGroup(tx, as(), { name: "Tuesday night", typeId: aKind }))).id;
  await run((tx) => addToGroup(tx, as(), { groupId: group, memberId: leader, role: "leader" }));
  await run((tx) => addToGroup(tx, as(), { groupId: group, memberId: member }));
});

afterAll(async () => {
  await dropTenants("scopetest");
  await owner()`delete from app_users where id = ${leaderUser}`;
  await closeConnections();
});

describe("who the account is (R9.3)", () => {
  it("finds the person an account belongs to", async () => {
    expect(await run((tx) => personForUser(tx, leaderUser))).toBe(leader);
  });

  it("answers nothing for an account with no person record", async () => {
    expect(await run((tx) => personForUser(tx, "22222222-2222-4222-8222-222222222222"))).toBeNull();
  });
});

describe("what a group leader may see (R9.3)", () => {
  it("is their own group's roster, and themselves", async () => {
    const allowed = await run((tx) => visiblePeople(tx, viewer), "group_leader");
    expect(allowed).not.toBeNull();
    expect([...allowed!].sort()).toEqual([leader, member].sort());
  });

  it("is what the directory returns, not just what a page draws", async () => {
    const rows = await run((tx) => listPeople(tx, { viewer }), "group_leader");
    expect(rows.map((r) => r.id).sort()).toEqual([leader, member].sort());
    expect(rows.map((r) => r.firstName)).not.toContain("Joy");
  });

  it("is what the count says, so a total cannot leak a number", async () => {
    expect(await run((tx) => countPeople(tx, { viewer }), "group_leader")).toBe(2);
  });

  it("refuses somebody outside the group asked for by id", async () => {
    expect(await run((tx) => getPerson(tx, stranger, viewer), "group_leader")).toBeNull();
    expect(await run((tx) => getPerson(tx, member, viewer), "group_leader")).not.toBeNull();
  });

  it("refuses a selection that names somebody outside the group", async () => {
    // The way past a list filter is to ask for ids directly. Crossed with the
    // scope rather than trusted.
    const rows = await run(
      (tx) => listPeople(tx, { viewer, ids: [member, stranger] }),
      "group_leader",
    );
    expect(rows.map((r) => r.id)).toEqual([member]);
  });

  it("follows the roster: somebody who leaves goes out of view", async () => {
    await run((tx) => removeFromGroup(tx, as(), { groupId: group, memberId: member }));
    const rows = await run((tx) => listPeople(tx, { viewer }), "group_leader");
    expect(rows.map((r) => r.id)).toEqual([leader]);

    await run((tx) => addToGroup(tx, as(), { groupId: group, memberId: member }));
  });

  it("shows a leader of nothing only themselves", async () => {
    const lonely = "33333333-3333-4333-8333-333333333333";
    await owner()`
      insert into app_users (id, email) values (${lonely}, 'lonely@scopetest.invalid')
      on conflict (id) do nothing`;
    const person = await run((tx) =>
      createPerson(tx, as(), {
        firstName: "Lonely", lastName: "Scopetest", lifecycleStatus: "member",
      } as never),
    );
    await run((tx) => linkPersonToUser(tx, person.id, lonely));

    const allowed = await run((tx) =>
      visiblePeople(tx, { role: "group_leader", userId: lonely }), "group_leader");
    expect(allowed).toEqual([person.id]);

    await owner()`delete from app_users where id = ${lonely}`;
  });

  it("shows nobody at all to a leader with no person record", async () => {
    const allowed = await run((tx) =>
      visiblePeople(tx, { role: "group_leader", userId: "44444444-4444-4444-8444-444444444444" }),
      "group_leader",
    );
    expect(allowed).toEqual([]);
  });

  it("reads no confidential notes", () => {
    // The other half of R9.3's acceptance. Giving arrives in 0.3 and is already
    // restricted to Owner and Finance by the same mechanism.
    expect(canReadConfidentialNotes("group_leader")).toBe(false);
  });
});

describe("what a member may see", () => {
  it("is themselves, until the member directory exists", async () => {
    const allowed = await run((tx) =>
      visiblePeople(tx, { role: "member", userId: leaderUser }), "member");
    expect(allowed).toEqual([leader]);
  });
});

describe("what everybody else may see", () => {
  it("is the whole church, which is what null means", async () => {
    for (const role of ["owner", "admin", "staff", "pastoral", "checkin_volunteer"] as const) {
      const allowed = await run((tx) => visiblePeople(tx, { role, userId: leaderUser }), role);
      expect(allowed, role).toBeNull();
    }
  });

  it("is unchanged when no viewer is passed at all", async () => {
    const rows = await run((tx) => listPeople(tx, {}));
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  it("answers the one-person question the same way", async () => {
    expect(await run((tx) => canSeePerson(tx, { role: "owner" }, stranger))).toBe(true);
    expect(await run((tx) => canSeePerson(tx, viewer, stranger), "group_leader")).toBe(false);
  });
});
