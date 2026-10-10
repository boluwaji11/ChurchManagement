/**
 * HRT-86. The group finder and join requests (R9.5, R9.6).
 *
 * The thing worth testing here is the decision, not the browsing. A church that
 * declines somebody and keeps no record of it cannot answer them three months
 * later, and a leader who says yes and then has to go and add them to the
 * roster will forget the second half.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  findGroups, requestToJoin, pendingRequests, decideRequest, requestsFor,
  unnotifiedDecisions, markNotified,
} from "../src/repo/group-finder";
import {
  createGroup, updateGroup, addToGroup, groupRoster, seedGroupTypes, listGroupTypes,
} from "../src/repo/groups";
import { linkPersonToUser } from "../src/repo/scope";
import { createPerson } from "../src/repo/members";
import { InvalidInputError } from "../src/errors";
import { PermissionError, type TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let tuesday: string;
let closed: string;
let leader: string;
let seeker: string;
let smallType: string;

const leaderUser = "77777777-7777-4777-8777-777777777777";
const seekerUser = "88888888-8888-4888-8888-888888888888";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const asSeeker = { tenantId: "", role: "member" as TenantRole, userId: seekerUser };

beforeAll(async () => {
  tenant = await testTenant("findertest", "Finder Test Church");
  asSeeker.tenantId = tenant;

  for (const id of [leaderUser, seekerUser]) {
    await owner()`
      insert into app_users (id, email) values (${id}, ${`${id}@findertest.invalid`})
      on conflict (id) do nothing`;
  }

  await run((tx) => seedGroupTypes(tx, as()));
  smallType = (await run((tx) => listGroupTypes(tx))).find((t) => t.name === "Small group")!.id;

  const make = async (firstName: string) =>
    (await run((tx) =>
      createPerson(tx, as(), {
        firstName, lastName: "Finder", lifecycleStatus: "member",
      } as never),
    )).id;

  leader = await make("Ruth");
  seeker = await make("Sam");
  await run((tx) => linkPersonToUser(tx, leader, leaderUser));
  await run((tx) => linkPersonToUser(tx, seeker, seekerUser));

  tuesday = (await run((tx) => createGroup(tx, as(), {
    name: "Tuesday night", typeId: smallType, dayOfWeek: 2, startsAt: "19:30",
    location: "The Hall", capacity: 3,
  }))).id;
  await run((tx) => addToGroup(tx, as(), { groupId: tuesday, memberId: leader, role: "leader" }));

  closed = (await run((tx) => createGroup(tx, as(), {
    name: "Elders", typeId: smallType, dayOfWeek: 1, location: "The Vestry", openToJoin: false,
  }))).id;

  await run((tx) => createGroup(tx, as(), {
    name: "Private thing", typeId: smallType, listed: false, dayOfWeek: 4,
  }));
});

afterAll(async () => {
  await dropTenants("findertest");
  await owner()`delete from app_users where id in (${leaderUser}, ${seekerUser})`;
  await closeConnections();
});

describe("browsing (R9.5)", () => {
  it("shows the listed groups and hides the unlisted one", async () => {
    const found = await run((tx) => findGroups(tx, { memberId: seeker }), "member");
    expect(found.map((g) => g.name).sort()).toEqual(["Elders", "Tuesday night"]);
  });

  it("shows a closed group rather than pretending the church has none", async () => {
    const found = await run((tx) => findGroups(tx, {}), "member");
    const elders = found.find((g) => g.name === "Elders")!;
    expect(elders.openToJoin).toBe(false);
  });

  it("filters by the three things members ask about", async () => {
    const byType = await run((tx) => findGroups(tx, { typeId: smallType }), "member");
    expect(byType.map((g) => g.name)).toEqual(["Tuesday night"]);

    const byDay = await run((tx) => findGroups(tx, { dayOfWeek: 1 }), "member");
    expect(byDay.map((g) => g.name)).toEqual(["Elders"]);

    // Typed the way somebody says it, rather than the way it was written down.
    const byPlace = await run((tx) => findGroups(tx, { location: "hall" }), "member");
    expect(byPlace.map((g) => g.name)).toEqual(["Tuesday night"]);
  });

  it("puts the unlisted ones on the same screen for whoever runs groups", async () => {
    const found = await run((tx) => findGroups(tx, { manage: true }));
    expect(found.map((g) => g.name)).toContain("Private thing");
    expect(found.find((g) => g.name === "Private thing")!.listed).toBe(false);
    expect(found.every((g) => g.archived === false)).toBe(true);
  });

  it("says where this person already stands", async () => {
    const found = await run((tx) => findGroups(tx, { memberId: leader }), "member");
    expect(found.find((g) => g.name === "Tuesday night")!.mine).toBe(true);
    expect(found.find((g) => g.name === "Elders")!.mine).toBe(false);
  });
});

describe("asking (R9.5)", () => {
  it("records the request, once, however many times they press", async () => {
    const asked = await run((tx) => requestToJoin(tx, asSeeker, { groupId: tuesday, message: "Hello" }), "member");
    expect(asked.status).toBe("pending");
    expect(asked.personName).toBe("Sam Finder");

    await run((tx) => requestToJoin(tx, asSeeker, { groupId: tuesday }), "member");
    const theirs = await run((tx) => requestsFor(tx, seeker), "member");
    expect(theirs.filter((r) => r.status === "pending").length).toBe(1);
  });

  it("shows them where it got to, on the finder", async () => {
    const found = await run((tx) => findGroups(tx, { memberId: seeker }), "member");
    expect(found.find((g) => g.name === "Tuesday night")!.requested).toBe("pending");
  });

  it("refuses a group that is not taking requests", async () => {
    await expect(run((tx) => requestToJoin(tx, asSeeker, { groupId: closed }), "member"))
      .rejects.toBeInstanceOf(InvalidInputError);
  });

  it("refuses somebody already in the group", async () => {
    await expect(
      run((tx) => requestToJoin(tx, { ...asSeeker, userId: leaderUser }, { groupId: tuesday }), "member"),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("refuses an account with no person record", async () => {
    await expect(
      run((tx) => requestToJoin(tx, { ...asSeeker, userId: null }, { groupId: tuesday }), "member"),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe("answering (R9.6)", () => {
  it("is waiting for the leader of that group, and for staff", async () => {
    const forLeader = await run(
      (tx) => pendingRequests(tx, { role: "group_leader", userId: leaderUser }),
      "group_leader",
    );
    expect(forLeader.map((r) => r.personName)).toEqual(["Sam Finder"]);

    const forStaff = await run((tx) => pendingRequests(tx, { role: "staff" }), "staff");
    expect(forStaff.length).toBe(1);
  });

  it("is not waiting for somebody who leads nothing", async () => {
    const theirs = await run(
      (tx) => pendingRequests(tx, { role: "group_leader", userId: seekerUser }),
      "group_leader",
    );
    expect(theirs).toEqual([]);
  });

  it("is refused to a leader of some other group", async () => {
    const [request] = await run((tx) => pendingRequests(tx, { role: "staff" }), "staff");
    await expect(
      run(
        (tx) => decideRequest(tx, { tenantId: tenant, role: "group_leader", userId: seekerUser }, {
          requestId: request!.id, approve: true,
        }),
        "group_leader",
      ),
    ).rejects.toBeInstanceOf(PermissionError);
  });

  it("puts them on the roster in the same breath as approving", async () => {
    const [request] = await run((tx) => pendingRequests(tx, { role: "staff" }), "staff");
    const decided = await run((tx) =>
      decideRequest(tx, { tenantId: tenant, role: "group_leader", userId: leaderUser }, {
        requestId: request!.id, approve: true,
      }), "group_leader");

    expect(decided.status).toBe("approved");
    const roster = await run((tx) => groupRoster(tx, tuesday));
    expect(roster.map((m) => m.memberId)).toContain(seeker);
  });

  it("refuses to answer the same request twice", async () => {
    const [answered] = await run((tx) => requestsFor(tx, seeker), "member");
    await expect(
      run((tx) => decideRequest(tx, { tenantId: tenant, role: "owner" }, {
        requestId: answered!.id, approve: false,
      })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("keeps a declined answer, rather than letting it disappear", async () => {
    const other = await run((tx) => createGroup(tx, as(), { name: "Thursday men", typeId: smallType, dayOfWeek: 4 }));
    await run((tx) => addToGroup(tx, as(), { groupId: other.id, memberId: leader, role: "leader" }));

    const asked = await run((tx) => requestToJoin(tx, asSeeker, { groupId: other.id }), "member");
    const declined = await run((tx) =>
      decideRequest(tx, { tenantId: tenant, role: "owner" }, { requestId: asked.id, approve: false }));

    expect(declined.status).toBe("declined");
    expect(declined.decidedAt).not.toBeNull();

    const theirs = await run((tx) => requestsFor(tx, seeker), "member");
    expect(theirs.some((r) => r.status === "declined")).toBe(true);
  });
});

describe("telling them (R9.6)", () => {
  it("knows which answers nobody has sent yet", async () => {
    const waiting = await run((tx) => unnotifiedDecisions(tx));
    expect(waiting.length).toBeGreaterThanOrEqual(2);
    expect(waiting.every((r) => r.notifiedAt === null)).toBe(true);
  });

  it("stops counting one once it has been sent", async () => {
    const [first] = await run((tx) => unnotifiedDecisions(tx));
    await run((tx) => markNotified(tx, first!.id));

    const after = await run((tx) => unnotifiedDecisions(tx));
    expect(after.map((r) => r.id)).not.toContain(first!.id);
  });
});

describe("another church's groups", () => {
  it("are never found", async () => {
    const otherId = await testTenant("findertest2", "Other Finder Church");
    const theirs = await withTenant({ tenantId: otherId, role: "owner" }, (tx) => findGroups(tx, {}));
    expect(theirs).toEqual([]);
    await dropTenants("findertest2");
  });
});
