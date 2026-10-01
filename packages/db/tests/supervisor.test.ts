/**
 * HRT-62. The supervisor's screen (R8.17 to R8.19).
 *
 * The two-adult rule is the one assertion here that matters most. It is the
 * single most effective safeguarding practice a church has, and it fails
 * quietly: one volunteer steps out to find a parent and nobody notices the room
 * is down to one. These tests are what notices.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import { roomBoard, roomRoster, stillHere, MIN_VOLUNTEERS } from "../src/repo/supervisor";
import { checkInFamily, visitsFor } from "../src/repo/checkin";
import { checkOut } from "../src/repo/checkout";
import { addRoom } from "../src/repo/rooms";
import { addSpecialService } from "../src/repo/services";
import { createPerson } from "../src/repo/people";
import type { TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let service: string;
let nursery: string;
let kids: string;
const children: string[] = [];
const adults: string[] = [];

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const today = new Date().toISOString().slice(0, 10);
const room = (id: string, board: Awaited<ReturnType<typeof roomBoard>>) =>
  board.rooms.find((r) => r.roomId === id)!;

beforeAll(async () => {
  tenant = await testTenant("supervisortest", "Supervisor Test Church");

  // Capacity four, one volunteer for every two children.
  nursery = (await run((tx) => addRoom(tx, as(), { name: "Nursery", capacity: 4, ratio: 2 }))).id;
  kids = (await run((tx) => addRoom(tx, as(), { name: "Kids", capacity: 10 }))).id;
  service = (await run((tx) =>
    addSpecialService(tx, as(), { name: "Sunday", occursOn: today, startsAt: "09:00" }),
  )).id;

  for (let i = 0; i < 5; i += 1) {
    const person = await run((tx) =>
      createPerson(tx, as(), {
        firstName: `Child${i}`, lastName: "Super", lifecycleStatus: "member",
        dateOfBirth: "2023-01-01",
      } as never),
    );
    children.push(person.id);
  }

  for (const name of ["Ruth", "Joy", "Sam"]) {
    const person = await run((tx) =>
      createPerson(tx, as(), {
        firstName: name, lastName: "Super", lifecycleStatus: "member",
        dateOfBirth: "1980-01-01",
      } as never),
    );
    adults.push(person.id);
  }
});

afterAll(async () => {
  await dropTenants("supervisortest");
  await closeConnections();
});

describe("the board (R8.19)", () => {
  it("counts the children in a room, and the volunteers serving in it", async () => {
    await run((tx) => checkInFamily(tx, as(), {
      occurrenceId: service,
      entries: [
        { personId: children[0]!, roomId: nursery, child: true },
        { personId: children[1]!, roomId: nursery, child: true },
        { personId: adults[0]!, roomId: nursery, child: false },
        { personId: adults[1]!, roomId: nursery, child: false },
      ],
    }));

    const board = await run((tx) => roomBoard(tx, service));
    const n = room(nursery, board);
    expect(n.present).toBe(2);
    expect(n.volunteers).toBe(2);
    expect(n.collected).toBe(0);
    expect(board.outstanding).toBe(2);
  });

  it("knows a volunteer who is in no room", async () => {
    await run((tx) => checkInFamily(tx, as(), {
      occurrenceId: service,
      entries: [{ personId: adults[2]!, roomId: null, child: false }],
    }));
    const board = await run((tx) => roomBoard(tx, service));
    expect(board.unassignedVolunteers).toBe(1);
    // An adult in no room is not in a room's headcount either.
    expect(room(nursery, board).volunteers).toBe(2);
  });

  it("leaves a room nobody is in showing nothing, rather than an alert", async () => {
    const board = await run((tx) => roomBoard(tx, service));
    const empty = room(kids, board);
    expect(empty.present).toBe(0);
    expect(empty.twoAdultAlert).toBe(false);
    expect(empty.underStaffed).toBe(false);
  });
});

describe("the two-adult rule (R8.17)", () => {
  it("is two", () => {
    expect(MIN_VOLUNTEERS).toBe(2);
  });

  it("raises an alert the moment a room is down to one volunteer", async () => {
    const before = await run((tx) => roomBoard(tx, service));
    expect(room(nursery, before).twoAdultAlert).toBe(false);

    // One of them steps out to find a parent.
    const visits = await run((tx) => visitsFor(tx, service));
    const stepping = visits.find((v) => v.personId === adults[1])!;
    await run((tx) => checkOut(tx, as(), { visitId: stepping.id, code: stepping.code, override: null }));

    const after = await run((tx) => roomBoard(tx, service));
    expect(room(nursery, after).volunteers).toBe(1);
    expect(room(nursery, after).twoAdultAlert).toBe(true);
  });

  it("does not raise it for a room with no children in it", async () => {
    const board = await run((tx) => roomBoard(tx, service));
    expect(room(kids, board).volunteers).toBe(0);
    expect(room(kids, board).twoAdultAlert).toBe(false);
  });
});

describe("capacity and ratio (R8.15, R8.16)", () => {
  it("says when a room is at what it holds, and when it is past it", async () => {
    await run((tx) => checkInFamily(tx, as(), {
      occurrenceId: service,
      entries: [
        { personId: children[2]!, roomId: nursery, child: true },
        { personId: children[3]!, roomId: nursery, child: true },
      ],
    }));

    const at = await run((tx) => roomBoard(tx, service));
    expect(room(nursery, at).present).toBe(4);
    expect(room(nursery, at).full).toBe(true);
    expect(room(nursery, at).over).toBe(false);

    await run((tx) => checkInFamily(tx, as(), {
      occurrenceId: service,
      entries: [{ personId: children[4]!, roomId: nursery, child: true }],
    }));

    const past = await run((tx) => roomBoard(tx, service));
    expect(room(nursery, past).over).toBe(true);
  });

  it("says when there are too few volunteers for the children present", async () => {
    // One volunteer, one for every two children, five children in the room.
    const board = await run((tx) => roomBoard(tx, service));
    expect(room(nursery, board).volunteers).toBe(1);
    expect(room(nursery, board).underStaffed).toBe(true);
  });
});

describe("the room roster (R8.18)", () => {
  it("shows who is present and who has been collected", async () => {
    const roster = await run((tx) => roomRoster(tx, service, nursery));
    const names = roster.map((r) => r.name);
    expect(names).toContain("Child0 Super");
    expect(names).toContain("Ruth Super");

    const gone = roster.find((r) => r.name === "Joy Super")!;
    expect(gone.checkedOutAt).not.toBeNull();
  });

  it("carries what the room has to know (R8.10)", async () => {
    await owner()`update people set allergies = 'Peanuts' where id = ${children[0]!}`;

    const roster = await run((tx) => roomRoster(tx, service, nursery));
    expect(roster.find((r) => r.name === "Child0 Super")!.allergies).toBe("Peanuts");
  });

  it("lists everybody still in a room at the end of the service", async () => {
    const left = await run((tx) => stillHere(tx, service));
    // Children only: an adult serving is not somebody to be collected.
    expect(left.every((r) => r.kind === "child")).toBe(true);
    expect(left.length).toBe(5);
  });
});
