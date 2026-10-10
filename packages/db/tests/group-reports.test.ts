/**
 * HRT-189, R18.6. Group participation and group health.
 *
 * The number a church acts on here is the quiet one: which groups have
 * recorded nothing. So the checks are mostly about the difference between a
 * group that cancelled and a group that said nothing, because every other
 * system treats those as the same fact and that is why nobody trusts the
 * figure.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { withTenant, closeConnections, type Tx } from "../src/client";
import {
  groupParticipation, groupHealth, groupsByType, groupMeetingsByMonth,
} from "../src/repo/group-reports";
import {
  seedGroupTypes, listGroupTypes, createGroup, addToGroup, setGroupArchived,
} from "../src/repo/groups";
import { openMeeting, recordMeeting } from "../src/repo/group-attendance";
import { createPerson } from "../src/repo/members";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let smallGroupType: string;
/** Four members, all counted. */
let people: string[] = [];
/** Meets, and everybody comes. */
let lively: string;
/** Meets, and almost nobody comes. */
let thin: string;
/** Records that it did not meet, which is a leader doing their job. */
let cancelling: string;
/** Says nothing at all. This is the one the report exists for. */
let silent: string;

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role, userId: null });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

/** Today and a day a known number of days back, as the report counts them. */
const today = new Date();
const iso = (daysBack: number): string => {
  const at = new Date(today);
  at.setUTCDate(at.getUTCDate() - daysBack);
  return at.toISOString().slice(0, 10);
};
const RANGE = { from: iso(365), to: iso(0) };

const meet = (groupId: string, metOn: string, presentIds: string[], notHeld = false) =>
  run(async (tx) => {
    const opened = await openMeeting(tx, as(), { groupId, metOn });
    return recordMeeting(tx, as(), {
      meetingId: opened.meeting.id,
      presentIds,
      notHeld,
    });
  });

beforeAll(async () => {
  tenant = await testTenant("groupreport", "Group Report Church");
  await run((tx) => seedGroupTypes(tx, as()));
  smallGroupType = (await run((tx) => listGroupTypes(tx)))
    .find((one) => one.name === "Small group")!.id;

  const made = await Promise.all(
    ["Ada", "Ben", "Cara", "Dan"].map((firstName) =>
      run((tx) =>
        createPerson(tx, as(), {
          firstName, lastName: "Reporttest", lifecycleStatus: "member",
        } as never)),
    ),
  );
  people = made.map((one) => one.id);

  const group = async (name: string) =>
    (await run((tx) =>
      createGroup(tx, as(), { name, typeId: smallGroupType } as never))).id;

  lively = await group("Tuesday Lively");
  thin = await group("Tuesday Thin");
  cancelling = await group("Tuesday Cancelling");
  silent = await group("Tuesday Silent");

  // Ada, Ben and Cara are in the lively group. Ada leads it.
  await run((tx) => addToGroup(tx, as(), { groupId: lively, memberId: people[0]!, role: "leader" }));
  await run((tx) => addToGroup(tx, as(), { groupId: lively, memberId: people[1]! }));
  await run((tx) => addToGroup(tx, as(), { groupId: lively, memberId: people[2]! }));

  // The thin group has the same three on its roster, and a leader.
  await run((tx) => addToGroup(tx, as(), { groupId: thin, memberId: people[0]!, role: "leader" }));
  await run((tx) => addToGroup(tx, as(), { groupId: thin, memberId: people[1]! }));
  await run((tx) => addToGroup(tx, as(), { groupId: thin, memberId: people[2]! }));

  // The cancelling group has a leader. The silent one deliberately does not.
  await run((tx) => addToGroup(tx, as(), { groupId: cancelling, memberId: people[0]!, role: "leader" }));
  await run((tx) => addToGroup(tx, as(), { groupId: silent, memberId: people[3]! }));

  // Three meetings, everybody there.
  for (const day of [30, 23, 16]) {
    await meet(lively, iso(day), [people[0]!, people[1]!, people[2]!]);
  }
  // Three meetings, one person each time.
  for (const day of [30, 23, 16]) {
    await meet(thin, iso(day), [people[0]!]);
  }
  // Recorded as not held, twice.
  for (const day of [30, 23]) {
    await meet(cancelling, iso(day), [], true);
  }
  // Nothing at all for the silent group.
});

afterAll(async () => {
  await dropTenants("groupreport");
  await closeConnections();
});

describe("how many are in a group", () => {
  it("counts a member once however many groups they are in", async () => {
    const found = await run((tx) => groupParticipation(tx, RANGE));

    // Ada, Ben and Cara are each in two groups. Dan is in one. All four count.
    expect(found.inAGroup).toBe(4);
    expect(found.counted).toBe(4);
    expect(found.rate).toBe(100);
  });

  it("counts the groups the church is running", async () => {
    const found = await run((tx) => groupParticipation(tx, RANGE));
    expect(found.groups).toBe(4);
  });
});

describe("which groups have gone quiet", () => {
  /*
   * The distinction the whole report turns on. The cancelling group recorded
   * that it did not meet, which is a leader telling the church something. The
   * silent group recorded nothing, which is a different fact.
   */
  it("counts a cancellation as having been heard from", async () => {
    const found = await run((tx) => groupParticipation(tx, RANGE));
    expect(found.meeting).toBe(3);
    expect(found.silent).toBe(1);
  });

  it("names the groups with nobody leading them", async () => {
    const found = await run((tx) => groupParticipation(tx, RANGE));
    expect(found.leaderless).toBe(1);
  });

  it("averages across meetings that were actually held", async () => {
    const found = await run((tx) => groupParticipation(tx, RANGE));
    // Nine present over six held meetings. The two cancellations are not
    // meetings with nobody at them.
    expect(found.average).toBe(2);
  });
});

describe("group by group", () => {
  it("puts the group nobody has heard from at the top", async () => {
    const rows = await run((tx) => groupHealth(tx, RANGE));
    expect(rows[0]!.name).toBe("Tuesday Silent");
    expect(rows[0]!.lastMetOn).toBeNull();
  });

  it("separates what was held from what was cancelled", async () => {
    const rows = await run((tx) => groupHealth(tx, RANGE));
    const off = rows.find((one) => one.name === "Tuesday Cancelling")!;
    expect(off.held).toBe(0);
    expect(off.cancelled).toBe(2);
    expect(off.average).toBe(0);
  });

  it("reads turnout against the roster rather than against the best week", async () => {
    const rows = await run((tx) => groupHealth(tx, RANGE));

    const full = rows.find((one) => one.name === "Tuesday Lively")!;
    expect(full.roster).toBe(3);
    expect(full.average).toBe(3);
    expect(full.turnout).toBe(100);

    const sparse = rows.find((one) => one.name === "Tuesday Thin")!;
    expect(sparse.roster).toBe(3);
    expect(sparse.average).toBe(1);
    expect(sparse.turnout).toBe(33);
  });

  it("carries the hue its kind of group wears everywhere else", async () => {
    const rows = await run((tx) => groupHealth(tx, RANGE));
    expect(rows.every((one) => one.hue.length > 0)).toBe(true);
    expect(rows.every((one) => one.type === "Small group")).toBe(true);
  });

  it("leaves out a group the church has archived", async () => {
    await run((tx) => setGroupArchived(tx, as(), silent, true));
    const rows = await run((tx) => groupHealth(tx, RANGE));
    expect(rows.map((one) => one.name)).not.toContain("Tuesday Silent");

    const found = await run((tx) => groupParticipation(tx, RANGE));
    expect(found.groups).toBe(3);

    await run((tx) => setGroupArchived(tx, as(), silent, false));
  });
});

describe("by kind, and over time", () => {
  it("counts a member once within a kind however many of its groups they are in", async () => {
    const byType = await run((tx) => groupsByType(tx));
    const small = byType.find((one) => one.name === "Small group")!;

    expect(small.groups).toBe(4);
    // Ada, Ben and Cara are each in two small groups, Dan in one. Four people.
    expect(small.members).toBe(4);
  });

  it("gives a month for every month in the window, including the empty ones", async () => {
    const months = await run((tx) => groupMeetingsByMonth(tx, RANGE));
    expect(months.length).toBeGreaterThanOrEqual(12);
    expect(months.every((one) => /^\d{4}-\d{2}$/.test(one.month))).toBe(true);
  });

  it("averages within the month and keeps the cancellations apart", async () => {
    const months = await run((tx) => groupMeetingsByMonth(tx, RANGE));
    const busy = months.filter((one) => one.held > 0);

    expect(busy.length).toBeGreaterThan(0);
    expect(busy.reduce((all, one) => all + one.held, 0)).toBe(6);
    expect(months.reduce((all, one) => all + one.cancelled, 0)).toBe(2);
  });
});
