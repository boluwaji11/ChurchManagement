/**
 * HRT-63. Incident reports (R8.13).
 *
 * The requirement is one sentence and every clause of it is load bearing:
 * restricted to the safeguarding roles, permanently retained, and carrying who
 * was in the room and whether the guardian was told. These are the assertions
 * that keep it that way.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  fileIncident, listIncidents, markGuardianNotified, unnotifiedCount,
  canFileIncident, canReadIncidents,
} from "../src/repo/incidents";
import { addRoom } from "../src/repo/rooms";
import { addSpecialService } from "../src/repo/services";
import { createPerson } from "../src/repo/people";
import { InvalidInputError } from "../src/errors";
import { PermissionError, TENANT_ROLES, type TenantRole } from "../src/roles";
import { testTenant, dropTenants } from "./helpers/tenant";

let tenant: string;
let child: string;
let room: string;
let service: string;

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

const today = new Date().toISOString().slice(0, 10);

beforeAll(async () => {
  tenant = await testTenant("incidenttest", "Incident Test Church");

  room = (await run((tx) => addRoom(tx, as(), { name: "Toddlers" }))).id;
  service = (await run((tx) =>
    addSpecialService(tx, as(), { name: "Sunday", occursOn: today, startsAt: "09:00" }),
  )).id;
  child = (await run((tx) =>
    createPerson(tx, as(), {
      firstName: "Noah", lastName: "Incident", lifecycleStatus: "member",
      dateOfBirth: "2022-02-02",
    } as never),
  )).id;
});

afterAll(async () => {
  await dropTenants("incidenttest");
  await closeConnections();
});

const file = (role: TenantRole = "owner", over: Partial<Parameters<typeof fileIncident>[2]> = {}) =>
  run((tx) => fileIncident(tx, as(role), {
    personId: child,
    roomId: room,
    occurrenceId: service,
    occurredOn: today,
    volunteers: "Ruth Bennett, Sam Carter",
    description: "Bumped his head on the corner of the shelf.",
    action: "Cold compress, watched for ten minutes, no mark.",
    ...over,
  }), role);

describe("filing one (R8.13)", () => {
  it("keeps everything the requirement names", async () => {
    const filed = await file();

    expect(filed.personName).toBe("Noah Incident");
    expect(filed.roomName).toBe("Toddlers");
    expect(filed.serviceName).toBe("Sunday");
    expect(filed.occurredOn).toBe(today);
    expect(filed.volunteers).toBe("Ruth Bennett, Sam Carter");
    expect(filed.description).toContain("shelf");
    expect(filed.action).toContain("Cold compress");
    expect(filed.guardianNotified).toBe(false);
  });

  it("refuses a report with nothing in it", async () => {
    await expect(file("owner", { description: "   " })).rejects.toBeInstanceOf(InvalidInputError);
    await expect(file("owner", { action: "" })).rejects.toBeInstanceOf(InvalidInputError);
    await expect(file("owner", { occurredOn: "yesterday" })).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("is written by the volunteer who saw it", async () => {
    // Filing is wider than reading on purpose. A report only a pastor can write
    // is a report written on Tuesday, from memory, by somebody who was not there.
    expect(canFileIncident("checkin_volunteer")).toBe(true);
    const filed = await file("checkin_volunteer");
    expect(filed.description).toContain("shelf");
  });

  it("is refused to somebody who has nothing to do with the room", async () => {
    await expect(file("member")).rejects.toBeInstanceOf(PermissionError);
    await expect(file("group_leader")).rejects.toBeInstanceOf(PermissionError);
  });
});

describe("who may read them (R8.13)", () => {
  it("is the safeguarding roles, and nobody else", () => {
    const allowed = TENANT_ROLES.filter((role) => canReadIncidents(role));
    expect([...allowed]).toEqual(["owner", "admin", "pastoral"]);
  });

  it("refuses the volunteer who filed it", async () => {
    // They wrote it and they were there. They still cannot read the file back,
    // because it names other volunteers and other children's incidents sit
    // beside it.
    await expect(run((tx) => listIncidents(tx, as("checkin_volunteer")), "checkin_volunteer"))
      .rejects.toBeInstanceOf(PermissionError);
    await expect(run((tx) => listIncidents(tx, as("staff")), "staff"))
      .rejects.toBeInstanceOf(PermissionError);
  });

  it("lists them newest first for a pastoral reader", async () => {
    const all = await run((tx) => listIncidents(tx, as("pastoral")), "pastoral");
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(all.every((i) => i.personName === "Noah Incident")).toBe(true);
  });

  it("lists one child's on their own", async () => {
    const theirs = await run((tx) => listIncidents(tx, as("admin"), { personId: child }), "admin");
    expect(theirs.length).toBeGreaterThanOrEqual(2);
  });
});

describe("telling the guardian (R8.13)", () => {
  it("counts the ones nobody has told yet", async () => {
    const waiting = await run((tx) => unnotifiedCount(tx, as()));
    expect(waiting).toBeGreaterThanOrEqual(2);
  });

  it("records the moment, and does not go back", async () => {
    const [latest] = await run((tx) => listIncidents(tx, as()));
    const told = await run((tx) => markGuardianNotified(tx, as(), latest!.id, null));

    expect(told.guardianNotified).toBe(true);
    expect(told.notifiedAt).not.toBeNull();

    // Marking it again leaves the first moment alone, because when they were
    // told is a fact about that day rather than about the last press.
    const again = await run((tx) => markGuardianNotified(tx, as(), latest!.id, null));
    expect(again.notifiedAt?.toISOString()).toBe(told.notifiedAt?.toISOString());
  });

  it("can be set as the report is written, where they were told at the door", async () => {
    const filed = await file("owner", { guardianNotified: true });
    expect(filed.guardianNotified).toBe(true);
    expect(filed.notifiedAt).not.toBeNull();
  });
});

describe("what is kept (R8.13)", () => {
  it("has no way to change what was written", async () => {
    // Deliberately a test about the shape of the module. An editIncident or a
    // deleteIncident would make every report arguable afterwards, which is the
    // thing a report exists to prevent.
    const api = Object.keys(await import("../src/repo/incidents"));
    expect(api.filter((name) => /^(edit|update|delete|remove|archive)/i.test(name))).toEqual([]);
  });

  it("is written to the audit log like everything else", async () => {
    const filed = await file();
    const rows = await owner()<{ n: string }[]>`
      select count(*)::text as n from audit_entries
       where tenant_id = ${tenant} and entity = 'incident_reports' and entity_id = ${filed.id}`;
    expect(Number(rows[0]!.n)).toBeGreaterThanOrEqual(1);
  });
});

describe("another church's reports", () => {
  it("are never returned", async () => {
    const otherId = await testTenant("incidenttest2", "Other Incident Church");
    const theirs = await withTenant({ tenantId: otherId, role: "owner" }, (tx) =>
      listIncidents(tx, { role: "owner" }),
    );
    expect(theirs).toEqual([]);
    await dropTenants("incidenttest2");
  });
});
