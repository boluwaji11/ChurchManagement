/**
 * HRT-85. Group attendance (R9.7, R7.4).
 *
 * The acceptance criterion has a stopwatch in it: recording attendance for a
 * group of twelve takes four taps and one submit on a phone. That is a claim
 * about the default, so it is asserted here as the shape of the data the screen
 * posts, rather than left to a screenshot.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  openMeeting, recordMeeting, meetingsFor, groupAttendanceFor, canRecordFor, lastMeetingDay,
} from "../src/repo/group-attendance";
import {
  createGroup, addToGroup, removeFromGroup, seedGroupTypes, listGroupTypes,
} from "../src/repo/groups";
import { linkPersonToUser } from "../src/repo/scope";
import { createPerson } from "../src/repo/members";
import { InvalidInputError } from "../src/errors";
import { PermissionError, type TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let group: string;
let leader: string;
const members: string[] = [];
const leaderUser = "55555555-5555-4555-8555-555555555555";
const strangerUser = "66666666-6666-4666-8666-666666666666";

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const TUESDAY = "2026-09-29";

/** R9.1. A kind for the groups these tests write down. */
let aKind: string;

beforeAll(async () => {
  tenant = await testTenant("meetingtest", "Meeting Test Church");
  await run((tx) => seedGroupTypes(tx, as()));
  /* R9.1. Every group is one of the kinds the church keeps. */
  aKind = (await run((tx) => listGroupTypes(tx)))[0]!.id;

  for (const id of [leaderUser, strangerUser]) {
    await owner()`
      insert into app_users (id, email) values (${id}, ${`${id}@meetingtest.invalid`})
      on conflict (id) do nothing`;
  }

  group = (await run((tx) => createGroup(tx, as(), {
    name: "Tuesday twelve", typeId: aKind, dayOfWeek: 2, startsAt: "19:30",
  }))).id;

  // Twelve on the roster, which is the size the criterion names.
  for (let i = 0; i < 12; i += 1) {
    const person = await run((tx) =>
      createPerson(tx, as(), {
        firstName: `Member${String(i).padStart(2, "0")}`, lastName: "Meeting",
        lifecycleStatus: "member",
      } as never),
    );
    members.push(person.id);
    await run((tx) => addToGroup(tx, as(), {
      groupId: group, memberId: person.id, role: i === 0 ? "leader" : "member",
    }));
  }

  leader = members[0]!;
  await run((tx) => linkPersonToUser(tx, leader, leaderUser));
});

afterAll(async () => {
  await dropTenants("meetingtest");
  await owner()`delete from app_users where id in (${leaderUser}, ${strangerUser})`;
  await closeConnections();
});

describe("opening a meeting (R9.7)", () => {
  it("creates it the first time and returns the same one after", async () => {
    const first = await run((tx) => openMeeting(tx, as(), { groupId: group, metOn: TUESDAY }));
    expect(first.meeting.metOn).toBe(TUESDAY);
    expect(first.members.length).toBe(12);
    expect(first.members.every((p) => p.present === false)).toBe(true);

    const again = await run((tx) => openMeeting(tx, as(), { groupId: group, metOn: TUESDAY }));
    expect(again.meeting.id).toBe(first.meeting.id);
  });

  it("refuses a day it cannot store", async () => {
    await expect(run((tx) => openMeeting(tx, as(), { groupId: group, metOn: "last tuesday" })))
      .rejects.toBeInstanceOf(InvalidInputError);
  });

  it("opens on the group's own day rather than today", () => {
    // A leader recording on Wednesday morning is offered Tuesday.
    expect(lastMeetingDay(2, "2026-09-30")).toBe("2026-09-29");
    expect(lastMeetingDay(2, "2026-09-29")).toBe("2026-09-29");
    expect(lastMeetingDay(0, "2026-09-30")).toBe("2026-09-27");
    // A group with no pattern is offered the day it is being recorded.
    expect(lastMeetingDay(null, "2026-09-30")).toBe("2026-09-30");
  });
});

describe("the submit (R9.7)", () => {
  it("writes the whole meeting in one call", async () => {
    const { meeting } = await run((tx) => openMeeting(tx, as(), { groupId: group, metOn: TUESDAY }));

    // Twelve on the roster, four were not there. That is the four taps the
    // criterion names, because the screen starts everybody present.
    const absent = members.slice(0, 4);
    const present = members.filter((id) => !absent.includes(id));

    const after = await run((tx) => recordMeeting(tx, as(), {
      meetingId: meeting.id, presentIds: present,
    }));

    expect(after.meeting.present).toBe(8);
    expect(after.meeting.roster).toBe(12);
    expect(after.members.filter((p) => p.present).length).toBe(8);
    expect(after.members.filter((p) => !p.present).map((p) => p.memberId).sort())
      .toEqual([...absent].sort());
  });

  it("is the whole truth each time, so unticking somebody removes them", async () => {
    const { meeting } = await run((tx) => openMeeting(tx, as(), { groupId: group, metOn: TUESDAY }));
    const after = await run((tx) => recordMeeting(tx, as(), {
      meetingId: meeting.id, presentIds: [members[5]!],
    }));
    expect(after.meeting.present).toBe(1);
  });

  it("refuses to write somebody who is not on the roster", async () => {
    const outsider = await run((tx) =>
      createPerson(tx, as(), {
        firstName: "Outsider", lastName: "Meeting", lifecycleStatus: "visitor",
      } as never),
    );
    const { meeting } = await run((tx) => openMeeting(tx, as(), { groupId: group, metOn: TUESDAY }));
    const after = await run((tx) => recordMeeting(tx, as(), {
      meetingId: meeting.id, presentIds: [members[1]!, outsider.id],
    }));
    expect(after.meeting.present).toBe(1);
    expect(after.members.map((p) => p.memberId)).not.toContain(outsider.id);
  });

  it("records that the group did not meet, and clears the names with it", async () => {
    const { meeting } = await run((tx) => openMeeting(tx, as(), { groupId: group, metOn: TUESDAY }));
    const after = await run((tx) => recordMeeting(tx, as(), {
      meetingId: meeting.id, presentIds: members, notHeld: true, note: "Half term",
    }));

    expect(after.meeting.notHeld).toBe(true);
    expect(after.meeting.present).toBe(0);
    expect(after.meeting.note).toBe("Half term");
  });
});

describe("who may record it (R9.3, R9.7)", () => {
  it("is staff and up for any group", async () => {
    for (const role of ["owner", "admin", "staff", "pastoral"] as const) {
      expect(await run((tx) => canRecordFor(tx, { role }, group), role), role).toBe(true);
    }
  });

  it("is the leader of that group, which is the point of the role", async () => {
    const allowed = await run(
      (tx) => canRecordFor(tx, { role: "group_leader", userId: leaderUser }, group),
      "group_leader",
    );
    expect(allowed).toBe(true);
  });

  it("is not a leader of some other group", async () => {
    const other = await run((tx) => createGroup(tx, as(), { name: "Somebody else's", typeId: aKind }));
    const allowed = await run(
      (tx) => canRecordFor(tx, { role: "group_leader", userId: leaderUser }, other.id),
      "group_leader",
    );
    expect(allowed).toBe(false);

    await expect(
      run(
        (tx) =>
          openMeeting(
            tx,
            { tenantId: tenant, role: "group_leader", userId: leaderUser },
            { groupId: other.id, metOn: TUESDAY },
          ),
        "group_leader",
      ),
    ).rejects.toBeInstanceOf(PermissionError);
  });

  it("is nobody with an account that is not a person here", async () => {
    const allowed = await run(
      (tx) => canRecordFor(tx, { role: "group_leader", userId: strangerUser }, group),
      "group_leader",
    );
    expect(allowed).toBe(false);
  });

  it("is not a member, and not a check-in volunteer", async () => {
    for (const role of ["member", "checkin_volunteer"] as const) {
      expect(await run((tx) => canRecordFor(tx, { role, userId: leaderUser }, group), role), role)
        .toBe(false);
    }
  });

  it("stops leading when they leave the group", async () => {
    await run((tx) => removeFromGroup(tx, as(), { groupId: group, memberId: leader }));
    const allowed = await run(
      (tx) => canRecordFor(tx, { role: "group_leader", userId: leaderUser }, group),
      "group_leader",
    );
    expect(allowed).toBe(false);

    await run((tx) => addToGroup(tx, as(), { groupId: group, memberId: leader, role: "leader" }));
  });
});

describe("what was recorded (R7.4)", () => {
  it("lists the group's meetings, most recent first", async () => {
    await run((tx) => openMeeting(tx, as(), { groupId: group, metOn: "2026-09-22" }));
    const meetings = await run((tx) => meetingsFor(tx, group));
    expect(meetings.map((m) => m.metOn)).toEqual(["2026-09-29", "2026-09-22"]);
    expect(meetings[0]!.roster).toBe(12);
  });

  it("shows on a person's record which meetings they were at", async () => {
    const { meeting } = await run((tx) => openMeeting(tx, as(), { groupId: group, metOn: "2026-09-22" }));
    await run((tx) => recordMeeting(tx, as(), { meetingId: meeting.id, presentIds: [members[2]!] }));

    const theirs = await run((tx) => groupAttendanceFor(tx, members[2]!));
    expect(theirs.map((a) => a.metOn)).toContain("2026-09-22");
    expect(theirs[0]!.groupName).toBe("Tuesday twelve");
  });
});

describe("another church's meetings", () => {
  it("are never returned", async () => {
    const otherId = await testTenant("meetingtest2", "Other Meeting Church");
    const theirs = await withTenant({ tenantId: otherId, role: "owner" }, (tx) =>
      meetingsFor(tx, group),
    );
    expect(theirs).toEqual([]);
    await dropTenants("meetingtest2");
  });
});
