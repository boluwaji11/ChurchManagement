/**
 * HRT-56. Checking a family in (R8.4, R8.5).
 *
 * The acceptance criteria in docs/checkin-acceptance.md are the definition of
 * done. This story covers the half before the label prints: the whole family in
 * one press, each child carrying the room they were sent to, and a second press
 * changing nothing.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  checkInFamily, visitsFor, undoCheckIn, roomCounts, canCheckIn, labelsFor,
} from "../src/repo/checkin";
import { looksLikeCode } from "../src/repo/codes";
import { addRoom } from "../src/repo/rooms";
import { addSpecialService, setOccurrenceCancelled } from "../src/repo/services";
import { createPerson } from "../src/repo/people";
import { attendanceForPerson } from "../src/repo/attendance";
import { InvalidInputError } from "../src/errors";
import { PermissionError, type TenantRole } from "../src/roles";
import { withAuditTriggersOff } from "../src/maintenance";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let service: string;
let nursery: string;
let kids: string;
let mia: string;
let danny: string;
let elena: string;

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const today = new Date().toISOString().slice(0, 10);

beforeAll(async () => {
  const rowId = await testTenant("checkintest", "Check-in Test Church");
  tenant = rowId;

  nursery = (await run((tx) => addRoom(tx, as(), { name: "Nursery", minAgeMonths: 0, maxAgeMonths: 24, capacity: 2 }))).id;
  kids = (await run((tx) => addRoom(tx, as(), { name: "Kids", minAgeMonths: 24, maxAgeMonths: 144 }))).id;

  service = (await run((tx) => addSpecialService(tx, as(), {
    name: "Sunday", occursOn: today, startsAt: "09:00",
  }))).id;

  const person = async (firstName: string, dateOfBirth: string | null) =>
    (await run((tx) =>
      createPerson(tx, as(), {
        firstName, lastName: "Ochoa", dateOfBirth, lifecycleStatus: "member",
      } as never),
    )).id;

  mia = await person("Mia", "2023-06-11");
  danny = await person("Danny", "2019-02-20");
  elena = await person("Elena", "1988-04-02");
});

afterAll(async () => {
  await dropTenants("checkintest", "checkintest2");
  await closeConnections();
});

describe("one press for the family", () => {
  it("checks children into their rooms and an adult into none", async () => {
    const visits = await run((tx) => checkInFamily(tx, as(), {
      occurrenceId: service,
      entries: [
        { personId: mia, roomId: nursery, child: true },
        { personId: danny, roomId: kids, child: true },
        { personId: elena, roomId: null, child: false },
      ],
    }));

    expect(visits.length).toBe(3);
    const byName = Object.fromEntries(visits.map((v) => [v.name, v]));
    expect(byName["Mia Ochoa"]!.roomName).toBe("Nursery");
    expect(byName["Danny Ochoa"]!.roomName).toBe("Kids");
    expect(byName["Elena Ochoa"]!.roomId).toBeNull();
  });

  it("marks them present, the same as the roster would", async () => {
    const rows = await run((tx) => attendanceForPerson(tx, mia));
    expect(rows.some((r) => r.occurrenceId === service)).toBe(true);
  });

  it("changes nothing when the same family is checked in twice", async () => {
    const before = await run((tx) => visitsFor(tx, service));

    await run((tx) => checkInFamily(tx, as(), {
      occurrenceId: service,
      entries: [{ personId: mia, roomId: kids }],
    }));

    const after = await run((tx) => visitsFor(tx, service));
    expect(after.length).toBe(before.length);
    // The room they were sent to first stands, rather than a second press
    // silently moving a child somebody has already been told where to find.
    expect(after.find((v) => v.personId === mia)!.roomName).toBe("Nursery");
  });

  it("counts who is in each room", async () => {
    const counts = await run((tx) => roomCounts(tx, service));
    expect(counts[nursery]).toBe(1);
    expect(counts[kids]).toBe(1);
  });
});

describe("undoing one", () => {
  it("takes the visit and the attendance mark with it", async () => {
    await run((tx) => undoCheckIn(tx, as(), service, elena));

    const visits = await run((tx) => visitsFor(tx, service));
    expect(visits.some((v) => v.personId === elena)).toBe(false);

    const rows = await run((tx) => attendanceForPerson(tx, elena));
    expect(rows.some((r) => r.occurrenceId === service)).toBe(false);
  });

  it("refuses for a child who has already been collected", async () => {
    await owner()`
      update checkin_visits set checked_out_at = now()
      where occurrence_id = ${service} and person_id = ${danny}`;

    await expect(run((tx) => undoCheckIn(tx, as(), service, danny)))
      .rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe("what it refuses", () => {
  it("refuses a service that was cancelled", async () => {
    const other = await run((tx) => addSpecialService(tx, as(), {
      name: "Cancelled one", occursOn: today, startsAt: "18:00",
    }));
    await run((tx) => setOccurrenceCancelled(tx, as(), other.id, true));

    await expect(
      run((tx) => checkInFamily(tx, as(), {
        occurrenceId: other.id, entries: [{ personId: mia, roomId: nursery }],
      })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("refuses a service that is not there", async () => {
    await expect(
      run((tx) => checkInFamily(tx, as(), {
        occurrenceId: "00000000-0000-0000-0000-000000000000",
        entries: [{ personId: mia, roomId: nursery }],
      })),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });
});

describe("who may run a station", () => {
  it("includes the volunteer who is running it", () => {
    expect(canCheckIn("checkin_volunteer")).toBe(true);
    expect(canCheckIn("owner")).toBe(true);
    expect(canCheckIn("staff")).toBe(true);
    expect(canCheckIn("member")).toBe(false);
    expect(canCheckIn("finance")).toBe(false);
  });

  it("refuses everybody else at the query layer", async () => {
    for (const role of ["member", "finance"] as TenantRole[]) {
      await expect(
        run((tx) => checkInFamily(tx, as(role), {
          occurrenceId: service, entries: [{ personId: mia, roomId: nursery }],
        }), role),
      ).rejects.toBeInstanceOf(PermissionError);
    }
  });
});

describe("another church", () => {
  it("cannot see these visits", async () => {
    const otherId = await testTenant("checkintest2", "Other Check-in Church");

    const theirs = await withTenant({ tenantId: otherId, role: "owner" }, (tx) =>
      visitsFor(tx, service),
    );
    expect(theirs).toEqual([]);

    await dropTenants("checkintest2");
  });
});

describe("the label pair (R8.6, R8.11)", () => {
  it("gives every child a code, and an adult none", async () => {
    const visits = await run((tx) => visitsFor(tx, service));
    const byName = Object.fromEntries(visits.map((v) => [v.name, v]));

    expect(looksLikeCode(byName["Mia Ochoa"]!.code ?? "")).toBe(true);
    // An adult takes a name badge, and a badge is not a claim on anybody.
    expect(byName["Elena Ochoa"]?.code ?? null).toBeNull();
  });

  it("never gives two children the same code", async () => {
    const visits = await run((tx) => visitsFor(tx, service));
    const codes = visits.map((v) => v.code).filter(Boolean);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("puts on the label what the room and the desk both need", async () => {
    const [label] = await run((tx) => labelsFor(tx, service, [mia], "Check-in Test Church"));

    expect(label!.childName).toBe("Mia Ochoa");
    expect(label!.roomName).toBe("Nursery");
    expect(label!.serviceName).toBe("Sunday");
    expect(label!.churchName).toBe("Check-in Test Church");
    expect(looksLikeCode(label!.code ?? "")).toBe(true);
  });

  it("gives an adult a name badge with no code on it (R8.5)", async () => {
    // She was taken back out by the undo test above, so she is checked in again.
    await run((tx) => checkInFamily(tx, as(), {
      occurrenceId: service,
      entries: [{ personId: elena, roomId: null, child: false }],
    }));

    const [label] = await run((tx) => labelsFor(tx, service, [elena], "Check-in Test Church"));
    expect(label!.childName).toBe("Elena Ochoa");
    // A badge says who somebody is. A code would be a claim on a child.
    expect(label!.code).toBeNull();
  });

  it("keeps the code a child already has when the desk presses again", async () => {
    const before = (await run((tx) => visitsFor(tx, service))).find((v) => v.personId === mia);

    await run((tx) => checkInFamily(tx, as(), {
      occurrenceId: service,
      entries: [{ personId: mia, roomId: nursery, child: true }],
    }));

    const after = (await run((tx) => visitsFor(tx, service))).find((v) => v.personId === mia);
    // Two codes for one child is two labels that do not match each other.
    expect(after!.code).toBe(before!.code);
  });
});

describe("allergies (R8.10)", () => {
  it("prints what the room has to know on the child's label", async () => {
    await owner()`
      update people set allergies = 'Peanuts' where id = ${mia}`;

    const [label] = await run((tx) => labelsFor(tx, service, [mia], "Check-in Test Church"));
    expect(label!.allergy).toBe("Peanuts");
  });

  it("says nothing for a child with nothing recorded", async () => {
    // Silence means nobody has written anything down. A label claiming a child
    // is clear would be claiming something the church was never told.
    const [label] = await run((tx) => labelsFor(tx, service, [danny], "Check-in Test Church"));
    expect(label!.allergy).toBeNull();
  });
});
