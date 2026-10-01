/**
 * HRT-49. Who was at a gathering (R7.3, R7.7).
 *
 * A row means present. There is no absent row, so correcting a mistake is a
 * delete, and the audit trigger records it like any other write. The tests here
 * are the ones that protect a tablet under a thumb: the same press twice must
 * not undo itself.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  listRoster, setPresent, setPresentMany, countPresent, attendanceForPerson, countsFor,
  visitNumbers, visitorsBetween, absentPeople,
} from "../src/repo/attendance";
import { addService, listOccurrences, setOccurrenceCancelled } from "../src/repo/services";
import { createPerson } from "../src/repo/people";
import { InvalidInputError } from "../src/errors";
import { PermissionError, type TenantRole } from "../src/roles";
import { withAuditTriggersOff } from "../src/maintenance";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
const ids: Record<string, string> = {};
let sunday: string;
let easter: string;

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

beforeAll(async () => {
  const rowId = await testTenant("attendtest", "Attendance Test Church");
  tenant = rowId;

  for (const first of ["Abigail", "Benjamin", "Caroline"]) {
    const p = await run((tx) =>
      createPerson(tx, as(), {
        firstName: first, lastName: "Attendtest", lifecycleStatus: "member",
      } as never),
    );
    ids[first] = p.id;
  }

  await run((tx) => addService(tx, as(), { name: "Sunday", occursOn: "2026-02-01", startsAt: "09:00" }));
  await run((tx) => addService(tx, as(), { name: "Easter", occursOn: "2026-04-05", startsAt: "09:00" }));
  const rows = await run((tx) => listOccurrences(tx));
  sunday = rows.find((r) => r.name === "Sunday")!.id;
  easter = rows.find((r) => r.name === "Easter")!.id;
});

afterAll(async () => {
  await dropTenants("attendtest");
  await closeConnections();
});

describe("the roster", () => {
  it("lists everyone, saying who is already marked", async () => {
    const roster = await run((tx) => listRoster(tx, sunday));
    expect(roster.map((r) => r.firstName)).toEqual(["Abigail", "Benjamin", "Caroline"]);
    expect(roster.every((r) => r.present)).toBe(false);
  });

  it("marks one person, and the same press twice does not undo itself", async () => {
    await run((tx) => setPresent(tx, as(), sunday, ids["Abigail"]!, true));
    await run((tx) => setPresent(tx, as(), sunday, ids["Abigail"]!, true));

    expect(await run((tx) => countPresent(tx, sunday))).toBe(1);
    const roster = await run((tx) => listRoster(tx, sunday));
    expect(roster.find((r) => r.firstName === "Abigail")!.present).toBe(true);
  });

  it("takes a mark off, which is how a mistake is corrected", async () => {
    await run((tx) => setPresent(tx, as(), sunday, ids["Abigail"]!, false));
    await run((tx) => setPresent(tx, as(), sunday, ids["Abigail"]!, false));
    expect(await run((tx) => countPresent(tx, sunday))).toBe(0);
  });

  it("marks a selection in one statement", async () => {
    const result = await run((tx) =>
      setPresentMany(tx, as(), sunday, [ids["Abigail"]!, ids["Benjamin"]!, ids["Caroline"]!], true),
    );
    expect(result.changed).toBe(3);
    expect(await run((tx) => countPresent(tx, sunday))).toBe(3);

    // Already marked, so nothing changes and nothing breaks.
    const again = await run((tx) =>
      setPresentMany(tx, as(), sunday, [ids["Abigail"]!, ids["Benjamin"]!], true),
    );
    expect(again.changed).toBe(0);

    const off = await run((tx) => setPresentMany(tx, as(), sunday, [ids["Caroline"]!], false));
    expect(off.changed).toBe(1);
    expect(await run((tx) => countPresent(tx, sunday))).toBe(2);
  });
});

describe("what it refuses", () => {
  it("refuses a gathering that was cancelled", async () => {
    await run((tx) => setOccurrenceCancelled(tx, as(), easter, true, "Snow"));
    await expect(
      run((tx) => setPresent(tx, as(), easter, ids["Abigail"]!, true)),
    ).rejects.toBeInstanceOf(InvalidInputError);
    await run((tx) => setOccurrenceCancelled(tx, as(), easter, false));
  });

  it("refuses a role that may not record", async () => {
    await expect(
      run((tx) => setPresent(tx, as("member"), sunday, ids["Abigail"]!, true), "member"),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});

describe("history", () => {
  it("reads one person's gatherings, most recent first", async () => {
    await run((tx) => setPresent(tx, as(), easter, ids["Abigail"]!, true));
    const history = await run((tx) => attendanceForPerson(tx, ids["Abigail"]!));
    expect(history.map((h) => h.name)).toEqual(["Easter", "Sunday"]);
  });

  it("counts several gatherings in one query", async () => {
    const counts = await run((tx) => countsFor(tx, [sunday, easter]));
    expect(counts[sunday]).toBe(2);
    expect(counts[easter]).toBe(1);
  });
});

describe("first and second visits (R7.5)", () => {
  let gatheringA: string;
  let gatheringB: string;
  let gatheringC: string;
  let evening: string;

  beforeAll(async () => {
    await owner()`delete from attendance_records where tenant_id = ${tenant}`;
    await owner()`delete from service_occurrences where tenant_id = ${tenant}`;
    // R7.5 is about people the church has recorded as visitors.
    await owner()`
      update people set lifecycle_status = 'visitor', first_visit_on = null
      where tenant_id = ${tenant}`;

    for (const [name, on, at] of [
      ["Week one", "2026-06-07", "09:00"],
      ["Week one evening", "2026-06-07", "18:00"],
      ["Week two", "2026-06-14", "09:00"],
      ["Week three", "2026-06-21", "09:00"],
    ] as const) {
      await run((tx) => addService(tx, as(), { name, occursOn: on, startsAt: at }));
    }
    const rows = await run((tx) => listOccurrences(tx));
    gatheringA = rows.find((r) => r.name === "Week one")!.id;
    evening = rows.find((r) => r.name === "Week one evening")!.id;
    gatheringB = rows.find((r) => r.name === "Week two")!.id;
    gatheringC = rows.find((r) => r.name === "Week three")!.id;
  });

  it("counts a first visit, then a second", async () => {
    await run((tx) => setPresent(tx, as(), gatheringA, ids["Abigail"]!, true));
    expect((await run((tx) => visitNumbers(tx, gatheringA)))[0]!.visit).toBe(1);

    await run((tx) => setPresent(tx, as(), gatheringB, ids["Abigail"]!, true));
    expect((await run((tx) => visitNumbers(tx, gatheringB)))[0]!.visit).toBe(2);

    await run((tx) => setPresent(tx, as(), gatheringC, ids["Abigail"]!, true));
    expect((await run((tx) => visitNumbers(tx, gatheringC)))[0]!.visit).toBe(3);
  });

  it("counts two services on one day as one visit", async () => {
    await run((tx) => setPresent(tx, as(), evening, ids["Abigail"]!, true));

    // She was at both services on her first Sunday. She turned up once.
    const morning = await run((tx) => visitNumbers(tx, gatheringA));
    const night = await run((tx) => visitNumbers(tx, evening));
    expect(morning.find((v) => v.personId === ids["Abigail"])!.visit).toBe(1);
    expect(night.find((v) => v.personId === ids["Abigail"])!.visit).toBe(1);
  });

  it("recounts after a correction rather than keeping a stale flag", async () => {
    // Her first Sunday is deleted, so week two becomes the first visit.
    await run((tx) => setPresent(tx, as(), gatheringA, ids["Abigail"]!, false));
    await run((tx) => setPresent(tx, as(), evening, ids["Abigail"]!, false));

    expect((await run((tx) => visitNumbers(tx, gatheringB)))[0]!.visit).toBe(1);
  });

  it("lists who was new in a window, once each, in a stable order", async () => {
    await run((tx) => setPresent(tx, as(), gatheringB, ids["Benjamin"]!, true));
    await run((tx) => setPresent(tx, as(), gatheringC, ids["Caroline"]!, true));

    // Caroline came first on the 21st. Abigail and Benjamin both on the 14th,
    // so the name breaks the tie and the order is the same on every load.
    const first = await run((tx) => visitorsBetween(tx, "2026-06-01", "2026-06-30", 1));
    expect(first.map((v) => v.firstName)).toEqual(["Caroline", "Abigail", "Benjamin"]);

    const second = await run((tx) => visitorsBetween(tx, "2026-06-01", "2026-06-30", 2));
    expect(second.map((v) => v.firstName)).toEqual(["Abigail"]);
  });
});

describe("absence (R7.6)", () => {
  beforeAll(async () => {
    await owner()`delete from attendance_records where tenant_id = ${tenant}`;
    await owner()`delete from service_occurrences where tenant_id = ${tenant}`;
    // R7.6 is about members and regular attenders drifting away.
    await owner()`update people set lifecycle_status = 'member' where tenant_id = ${tenant}`;

    for (const [name, on] of [
      ["S1", "2026-03-01"], ["S2", "2026-03-08"], ["S3", "2026-03-15"],
      ["S4", "2026-03-22"], ["S5", "2026-03-29"],
    ] as const) {
      await run((tx) => addService(tx, as(), { name, occursOn: on, startsAt: "09:00" }));
    }
    const rows = await run((tx) => listOccurrences(tx));
    const at = (name: string) => rows.find((r) => r.name === name)!.id;

    // Abigail comes every week. Benjamin stopped after the first. Caroline
    // stopped after the third.
    for (const name of ["S1", "S2", "S3", "S4", "S5"]) {
      await run((tx) => setPresent(tx, as(), at(name), ids["Abigail"]!, true));
    }
    await run((tx) => setPresent(tx, as(), at("S1"), ids["Benjamin"]!, true));
    await run((tx) => setPresent(tx, as(), at("S3"), ids["Caroline"]!, true));
  });

  it("finds who has missed the threshold, longest gone first", async () => {
    const absent = await run((tx) =>
      absentPeople(tx, { threshold: 3, asOf: "2026-03-29" }),
    );

    expect(absent.map((a) => a.firstName)).toEqual(["Benjamin"]);
    expect(absent[0]!.missed).toBe(4);
    expect(absent[0]!.lastSeenOn).toBe("2026-03-01");
  });

  it("uses the threshold it is given", async () => {
    const two = await run((tx) => absentPeople(tx, { threshold: 2, asOf: "2026-03-29" }));
    expect(two.map((a) => a.firstName)).toEqual(["Benjamin", "Caroline"]);
  });

  it("leaves out somebody who was there last week", async () => {
    const absent = await run((tx) => absentPeople(tx, { threshold: 1, asOf: "2026-03-29" }));
    expect(absent.map((a) => a.firstName)).not.toContain("Abigail");
  });

  it("does not count a service the church cancelled", async () => {
    const rows = await run((tx) => listOccurrences(tx));
    const s4 = rows.find((r) => r.name === "S4")!.id;
    const s5 = rows.find((r) => r.name === "S5")!.id;

    await run((tx) => setOccurrenceCancelled(tx, as(), s4, true, "Snow"));
    await run((tx) => setOccurrenceCancelled(tx, as(), s5, true, "Snow"));

    // Caroline last came on the 15th. Two of the three Sundays since did not
    // happen, so she has missed one, not three.
    const absent = await run((tx) => absentPeople(tx, { threshold: 3, asOf: "2026-03-29" }));
    expect(absent.map((a) => a.firstName)).not.toContain("Caroline");

    await run((tx) => setOccurrenceCancelled(tx, as(), s4, false));
    await run((tx) => setOccurrenceCancelled(tx, as(), s5, false));
  });

  it("leaves out a visitor, who was never a regular", async () => {
    const rows = await run((tx) => listOccurrences(tx));
    await owner()`
      update people set lifecycle_status = 'visitor'
      where id = ${ids["Benjamin"]!}`;

    const absent = await run((tx) => absentPeople(tx, { threshold: 3, asOf: "2026-03-29" }));
    expect(absent.map((a) => a.firstName)).not.toContain("Benjamin");
    expect(rows.length).toBeGreaterThan(0);

    await owner()`update people set lifecycle_status = 'member' where id = ${ids["Benjamin"]!}`;
  });

  it("leaves out somebody who has never been", async () => {
    const never = await run((tx) =>
      createPerson(tx, as(), {
        firstName: "Dorothy", lastName: "Attendtest", lifecycleStatus: "member",
      } as never),
    );
    const absent = await run((tx) => absentPeople(tx, { threshold: 1, asOf: "2026-03-29" }));
    expect(absent.some((a) => a.personId === never.id)).toBe(false);
  });
});

describe("the first visit date", () => {
  it("is filled from the service anybody is marked at", async () => {
    await owner()`delete from attendance_records where tenant_id = ${tenant}`;
    await owner()`
      update people set first_visit_on = null, lifecycle_status = 'visitor'
      where id = ${ids["Abigail"]!}`;
    await owner()`
      update people set first_visit_on = null, lifecycle_status = 'member'
      where id = ${ids["Benjamin"]!}`;

    const rows = await run((tx) => listOccurrences(tx));
    const first = rows[rows.length - 1]!;

    await run((tx) => setPresentMany(tx, as(), first.id, [ids["Abigail"]!, ids["Benjamin"]!], true));

    const after = await owner()<{ id: string; first_visit_on: string | null }[]>`
      select id, first_visit_on::text from people
      where id in (${ids["Abigail"]!}, ${ids["Benjamin"]!})`;

    const visitor = after.find((r) => r.id === ids["Abigail"]);
    const member = after.find((r) => r.id === ids["Benjamin"]);

    // Whoever is ticked, and whatever their status. A blank field beside a
    // person the church has at four services says less than the date of the
    // first of them.
    expect(visitor!.first_visit_on).toBe(first.occursOn);
    expect(member!.first_visit_on).toBe(first.occursOn);
  });

  it("moves back when an earlier service is filled in afterwards", async () => {
    await owner()`delete from attendance_records where tenant_id = ${tenant}`;
    await owner()`update people set first_visit_on = null where id = ${ids["Abigail"]!}`;

    const rows = await run((tx) => listOccurrences(tx));
    const recent = rows[0]!;
    const earliest = rows[rows.length - 1]!;

    await run((tx) => setPresent(tx, as(), recent.id, ids["Abigail"]!, true));
    const [afterRecent] = await owner()<{ first_visit_on: string }[]>`
      select first_visit_on::text from people where id = ${ids["Abigail"]!}`;
    expect(afterRecent!.first_visit_on).toBe(recent.occursOn);

    // A church back-filling last February gets February, rather than the day
    // it happened to type it in.
    await run((tx) => setPresent(tx, as(), earliest.id, ids["Abigail"]!, true));
    const [afterEarlier] = await owner()<{ first_visit_on: string }[]>`
      select first_visit_on::text from people where id = ${ids["Abigail"]!}`;
    expect(afterEarlier!.first_visit_on).toBe(earliest.occursOn);
  });

  it("goes back to blank when the last mark is taken off", async () => {
    await owner()`delete from attendance_records where tenant_id = ${tenant}`;
    await owner()`update people set first_visit_on = null where id = ${ids["Benjamin"]!}`;

    const rows = await run((tx) => listOccurrences(tx));
    const one = rows[0]!;

    await run((tx) => setPresent(tx, as(), one.id, ids["Benjamin"]!, true));
    await run((tx) => setPresent(tx, as(), one.id, ids["Benjamin"]!, false));

    const [after] = await owner()<{ first_visit_on: string | null }[]>`
      select first_visit_on::text from people where id = ${ids["Benjamin"]!}`;
    expect(after!.first_visit_on).toBeNull();
  });

  it("never overwrites a date the church already recorded", async () => {
    await owner()`
      update people set first_visit_on = '2019-04-07', lifecycle_status = 'visitor'
      where id = ${ids["Caroline"]!}`;

    const rows = await run((tx) => listOccurrences(tx));
    await run((tx) => setPresent(tx, as(), rows[0]!.id, ids["Caroline"]!, true));

    const [row] = await owner()<{ first_visit_on: string }[]>`
      select first_visit_on::text from people where id = ${ids["Caroline"]!}`;
    expect(row!.first_visit_on).toBe("2019-04-07");
  });
});
