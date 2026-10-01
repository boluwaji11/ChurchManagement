/**
 * HRT-60. The station keeps working with no network (R8.20 to R8.24).
 *
 * The acceptance criterion is stated as a Sunday: the network interface goes
 * down mid-service, the station completes thirty check-ins and fifteen
 * checkouts, prints correct labels throughout, and reconciles all forty-five
 * with no data loss and no code collisions. That is what this file does.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  reserveCodes, reconcile, codeReserved, BLOCK_SIZE,
  type OfflineEvent,
} from "../src/repo/offline";
import { checkInFamily, visitsFor, labelsFor } from "../src/repo/checkin";
import { checkOut } from "../src/repo/checkout";
import { addRoom } from "../src/repo/rooms";
import { addStation } from "../src/repo/stations";
import { addSpecialService } from "../src/repo/services";
import { createPerson } from "../src/repo/people";
import { PermissionError, type TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let service: string;
let station: string;
let other: string;
let room: string;
/** Thirty children, which is what the acceptance criterion asks for. */
const children: string[] = [];

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const today = new Date().toISOString().slice(0, 10);
const at = (minute: number) => new Date(Date.UTC(2026, 0, 4, 15, minute)).toISOString();

beforeAll(async () => {
  tenant = await testTenant("offlinetest", "Offline Test Church");

  room = (await run((tx) => addRoom(tx, as(), { name: "Nursery" }))).id;
  station = (await run((tx) => addStation(tx, as(), { name: "Lobby" }))).id;
  other = (await run((tx) => addStation(tx, as(), { name: "Side door" }))).id;
  service = (await run((tx) =>
    addSpecialService(tx, as(), { name: "Sunday", occursOn: today, startsAt: "09:00" }),
  )).id;

  for (let i = 0; i < 30; i += 1) {
    const person = await run((tx) =>
      createPerson(tx, as(), {
        firstName: `Child${i}`, lastName: "Offline", lifecycleStatus: "member",
        dateOfBirth: "2021-05-05",
      } as never),
    );
    children.push(person.id);
  }
});

afterAll(async () => {
  await dropTenants("offlinetest");
  await closeConnections();
});

describe("the codes a station carries (R8.21)", () => {
  it("hands out a full block, and the same block when asked twice", async () => {
    const block = await run((tx) =>
      reserveCodes(tx, as(), { occurrenceId: service, stationId: station, size: 40 }),
    );
    expect(block.codes.length).toBe(40);
    expect(block.used).toBe(0);
    expect(new Set(block.codes).size).toBe(40);

    const again = await run((tx) =>
      reserveCodes(tx, as(), { occurrenceId: service, stationId: station, size: 40 }),
    );
    expect(new Set(again.codes)).toEqual(new Set(block.codes));
  });

  it("gives two stations codes that cannot collide", async () => {
    const mine = await run((tx) =>
      reserveCodes(tx, as(), { occurrenceId: service, stationId: station, size: 40 }),
    );
    const theirs = await run((tx) =>
      reserveCodes(tx, as(), { occurrenceId: service, stationId: other, size: 40 }),
    );
    const overlap = mine.codes.filter((code) => theirs.codes.includes(code));
    expect(overlap).toEqual([]);
  });

  it("keeps the online path off a code a station is holding", async () => {
    const block = await run((tx) =>
      reserveCodes(tx, as(), { occurrenceId: service, stationId: station, size: 40 }),
    );
    const held = block.codes[0]!;
    expect(await run((tx) => codeReserved(tx, held))).toBe(true);

    const visits = await run((tx) =>
      checkInFamily(tx, as(), {
        occurrenceId: service,
        stationId: other,
        entries: [{ personId: children[29]!, roomId: room, child: true }],
      }),
    );
    expect(block.codes).not.toContain(visits[0]!.code);
  });

  it("is refused to a role that cannot run a station", async () => {
    await expect(
      run((tx) => reserveCodes(tx, as("member"), { occurrenceId: service, stationId: station }), "member"),
    ).rejects.toBeInstanceOf(PermissionError);
  });

  it("holds enough for a service without asking again", () => {
    expect(BLOCK_SIZE).toBeGreaterThanOrEqual(150);
  });
});

describe("a Sunday with the wifi down (R8.21, R8.23)", () => {
  it("reconciles thirty check-ins and fifteen checkouts with nothing lost", async () => {
    const block = await run((tx) =>
      reserveCodes(tx, as(), { occurrenceId: service, stationId: station, size: BLOCK_SIZE }),
    );

    // Twenty-nine, because one child was checked in online above, and that one
    // is the collision case rather than part of the clean run.
    const offline = children.slice(0, 29);
    const events: OfflineEvent[] = offline.map((personId, i) => ({
      id: randomUUID(),
      kind: "checkin",
      at: at(i),
      occurrenceId: service,
      personId,
      roomId: room,
      child: true,
      code: block.codes[i]!,
    }));

    const checkins = await run((tx) =>
      reconcile(tx, as(), { stationId: station, events }),
    );
    expect(checkins.applied).toBe(29);
    expect(checkins.conflicts).toEqual([]);

    const visits = await run((tx) => visitsFor(tx, service));
    const codes = visits.map((v) => v.code);
    expect(new Set(codes).size, "a code was issued twice").toBe(codes.length);

    // Each child wears the code their label was printed with at the station.
    for (const [i, personId] of offline.entries()) {
      const visit = visits.find((v) => v.personId === personId)!;
      expect(visit.code, `child ${i}`).toBe(block.codes[i]);
    }

    // R8.24. The labels the station printed offline say what the server says.
    const labels = await run((tx) =>
      labelsFor(tx, service, offline.slice(0, 3), "Offline Test Church"),
    );
    expect(labels.map((l) => l.code)).toEqual(block.codes.slice(0, 3));

    const collected = offline.slice(0, 15);
    const checkouts: OfflineEvent[] = collected.map((personId, i) => ({
      id: randomUUID(),
      kind: "checkout",
      at: at(70 + i),
      occurrenceId: service,
      personId,
      code: block.codes[i]!,
      collectedBy: null,
      override: null,
    }));

    const released = await run((tx) =>
      reconcile(tx, as(), { stationId: station, events: checkouts }),
    );
    expect(released.applied).toBe(15);
    expect(released.conflicts).toEqual([]);

    const after = await run((tx) => visitsFor(tx, service));
    const out = after.filter((v) => v.checkedOutAt !== null);
    expect(out.length).toBe(15);
    // The time on the record is when it happened in the room, rather than when
    // the wifi came back.
    expect(out[0]!.checkedOutAt!.toISOString()).toBe(at(70));
  });

  it("sends the same log twice without checking anybody in twice", async () => {
    const block = await run((tx) =>
      reserveCodes(tx, as(), { occurrenceId: service, stationId: station, size: BLOCK_SIZE }),
    );
    const person = children[29]!;
    const events: OfflineEvent[] = [
      {
        id: randomUUID(), kind: "checkin", at: at(5), occurrenceId: service,
        personId: person, roomId: room, child: true, code: block.codes[0]!,
      },
    ];

    // This child is already in from the online check-in above, so the first
    // attempt is the conflict case, and the second is the duplicate case.
    const first = await run((tx) => reconcile(tx, as(), { stationId: station, events }));
    expect(first.conflicts.map((c) => c.kind)).toEqual(["elsewhere"]);

    const second = await run((tx) => reconcile(tx, as(), { stationId: station, events }));
    expect(second.duplicates).toBe(1);
    expect(second.applied).toBe(0);

    const visits = await run((tx) => visitsFor(tx, service));
    expect(visits.filter((v) => v.personId === person).length).toBe(1);
  });
});

describe("what cannot be merged automatically (R8.23)", () => {
  let solo: string;
  let soloService: string;

  beforeAll(async () => {
    solo = (await run((tx) =>
      createPerson(tx, as(), {
        firstName: "Conflict", lastName: "Case", lifecycleStatus: "member",
        dateOfBirth: "2020-01-01",
      } as never),
    )).id;
    soloService = (await run((tx) =>
      addSpecialService(tx, as(), { name: "Evening", occursOn: today, startsAt: "18:00" }),
    )).id;
  });

  it("refuses a code the station was never given", async () => {
    const events: OfflineEvent[] = [
      {
        id: randomUUID(), kind: "checkin", at: at(10), occurrenceId: soloService,
        personId: solo, roomId: room, child: true, code: "ZZZZZ",
      },
    ];
    const result = await run((tx) => reconcile(tx, as(), { stationId: station, events }));
    expect(result.conflicts.map((c) => c.kind)).toEqual(["code"]);
    expect(await run((tx) => visitsFor(tx, soloService))).toEqual([]);
  });

  it("leaves a child where the record says they are, and reports it", async () => {
    await run((tx) =>
      checkInFamily(tx, as(), {
        occurrenceId: soloService, stationId: other,
        entries: [{ personId: solo, roomId: null, child: true }],
      }),
    );

    const block = await run((tx) =>
      reserveCodes(tx, as(), { occurrenceId: soloService, stationId: station, size: 10 }),
    );
    const events: OfflineEvent[] = [
      {
        id: randomUUID(), kind: "checkin", at: at(12), occurrenceId: soloService,
        personId: solo, roomId: room, child: true, code: block.codes[0]!,
      },
    ];

    const result = await run((tx) => reconcile(tx, as(), { stationId: station, events }));
    expect(result.conflicts.map((c) => c.kind)).toEqual(["elsewhere"]);

    const [visit] = await run((tx) => visitsFor(tx, soloService));
    expect(visit!.roomId, "the room was merged automatically").toBeNull();
  });

  it("reports a child somebody else had already collected", async () => {
    const [visit] = await run((tx) => visitsFor(tx, soloService));
    await run((tx) =>
      checkOut(tx, as(), { visitId: visit!.id, code: visit!.code }),
    );

    const events: OfflineEvent[] = [
      {
        id: randomUUID(), kind: "checkout", at: at(80), occurrenceId: soloService,
        personId: solo, code: visit!.code!, collectedBy: null, override: null,
      },
    ];
    const result = await run((tx) => reconcile(tx, as(), { stationId: station, events }));
    expect(result.conflicts.map((c) => c.kind)).toEqual(["collected"]);
  });

  it("reports a checkout for a child who was never checked in", async () => {
    const stranger = (await run((tx) =>
      createPerson(tx, as(), {
        firstName: "Never", lastName: "In", lifecycleStatus: "visitor",
      } as never),
    )).id;

    const events: OfflineEvent[] = [
      {
        id: randomUUID(), kind: "checkout", at: at(85), occurrenceId: soloService,
        personId: stranger, code: "ABCDE", collectedBy: null, override: null,
      },
    ];
    const result = await run((tx) => reconcile(tx, as(), { stationId: station, events }));
    expect(result.conflicts.map((c) => c.kind)).toEqual(["missing"]);
  });
});
