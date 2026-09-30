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
} from "../src/repo/attendance";
import { addService, listOccurrences, setOccurrenceCancelled } from "../src/repo/services";
import { createPerson } from "../src/repo/people";
import { InvalidInputError } from "../src/errors";
import { PermissionError, type TenantRole } from "../src/roles";
import { withAuditTriggersOff } from "../src/maintenance";

let tenant: string;
const ids: Record<string, string> = {};
let sunday: string;
let easter: string;

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

beforeAll(async () => {
  const [row] = await owner()<{ id: string }[]>`
    insert into tenants (slug, name, timezone)
    values ('attendtest', 'Attendance Test Church', 'America/Chicago')
    returning id`;
  tenant = row!.id;

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
  await withAuditTriggersOff(async () => {
    await owner()`delete from tenants where id = ${tenant}`;
  });
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
