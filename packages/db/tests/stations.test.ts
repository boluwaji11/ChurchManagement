/**
 * HRT-55. Stations and their four modes (R8.1, R8.2).
 *
 * The configuration belongs to the station rather than to the device, because
 * the design case is a tablet that dies at 09:40 on a Sunday. What matters in
 * these tests is that a station cannot be pointed at a room it was not given,
 * and that a retired station cannot quietly go on being used.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  addStation, updateStation, listStations, getStation, setStationArchived,
  claimStation, roomsForStation, canManageStations, STATION_MODES,
} from "../src/repo/stations";
import { addRoom } from "../src/repo/rooms";
import { addServiceTime } from "../src/repo/church";
import { InvalidInputError, NameTakenError } from "../src/errors";
import { PermissionError, type TenantRole } from "../src/roles";
import { withAuditTriggersOff } from "../src/maintenance";

let tenant: string;
let nursery: string;
let kids: string;
let sunday: string;

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

beforeAll(async () => {
  const [row] = await owner()<{ id: string }[]>`
    insert into tenants (slug, name, timezone)
    values ('stationtest', 'Station Test Church', 'America/Chicago')
    returning id`;
  tenant = row!.id;

  nursery = (await run((tx) => addRoom(tx, as(), { name: "Nursery", minAgeMonths: 0, maxAgeMonths: 24 }))).id;
  kids = (await run((tx) => addRoom(tx, as(), { name: "Kids", minAgeMonths: 24, maxAgeMonths: 144 }))).id;
  sunday = (await run((tx) => addServiceTime(tx, as(), { name: "Sunday", dayOfWeek: 0, startsAt: "09:00" }))).id;
});

afterAll(async () => {
  await withAuditTriggersOff(async () => {
    await owner()`delete from tenants where id = ${tenant}`;
  });
  await closeConnections();
});

describe("setting a station up", () => {
  it("takes a name, a mode, a printer, and what it may touch", async () => {
    const station = await run((tx) => addStation(tx, as(), {
      name: "Foyer desk", mode: "manned", printer: "brother",
      roomIds: [nursery], serviceTimeIds: [sunday],
    }));

    expect(station.mode).toBe("manned");
    expect(station.printer).toBe("brother");
    expect(station.roomIds).toEqual([nursery]);
    expect(station.serviceTimeIds).toEqual([sunday]);
    expect(station.lastSeenAt).toBeNull();
  });

  it("defaults to a manned desk printing on paper", async () => {
    const station = await run((tx) => addStation(tx, as(), { name: "Spare" }));
    expect(station.mode).toBe("manned");
    expect(station.printer).toBe("paper");
  });

  it("naming no rooms means every room", async () => {
    const station = await run((tx) => addStation(tx, as(), { name: "Everything" }));
    expect(station.roomIds).toEqual([]);

    const rooms = await run((tx) => roomsForStation(tx, station));
    expect(rooms.map((r) => r.name)).toEqual(["Nursery", "Kids"]);
  });

  it("naming rooms limits it to them", async () => {
    const station = await run((tx) => addStation(tx, as(), { name: "Nursery only", roomIds: [nursery] }));
    const rooms = await run((tx) => roomsForStation(tx, station));
    expect(rooms.map((r) => r.name)).toEqual(["Nursery"]);
  });

  it("refuses a name twice, and a mode or printer it does not have", async () => {
    await expect(run((tx) => addStation(tx, as(), { name: "foyer desk" })))
      .rejects.toBeInstanceOf(NameTakenError);
    await expect(run((tx) => addStation(tx, as(), { name: "Odd", mode: "hologram" })))
      .rejects.toBeInstanceOf(InvalidInputError);
    await expect(run((tx) => addStation(tx, as(), { name: "Odd", printer: "fax" })))
      .rejects.toBeInstanceOf(InvalidInputError);
    await expect(run((tx) => addStation(tx, as(), { name: "  " })))
      .rejects.toBeInstanceOf(InvalidInputError);
  });

  it("has all four modes", () => {
    expect([...STATION_MODES]).toEqual(["kiosk", "manned", "roaming", "phone"]);
  });

  it("keeps one station for the household's own phone, and no more", async () => {
    await run((tx) => addStation(tx, as(), { name: "Before you arrive", mode: "phone" }));
    await expect(run((tx) => addStation(tx, as(), { name: "Another phone", mode: "phone" })))
      .rejects.toBeInstanceOf(InvalidInputError);
  });

  it("drops a room that no longer exists rather than refusing to save", async () => {
    const station = await run((tx) => addStation(tx, as(), {
      name: "Hopeful", roomIds: [nursery, "00000000-0000-0000-0000-000000000000"],
    }));
    expect(station.roomIds).toEqual([nursery]);
  });
});

describe("changing one", () => {
  it("replaces the rooms it serves", async () => {
    const station = await run((tx) => addStation(tx, as(), { name: "Movable", roomIds: [nursery] }));
    const changed = await run((tx) => updateStation(tx, as(), station.id, {
      name: "Movable", mode: "kiosk", printer: "dymo", roomIds: [kids], serviceTimeIds: [],
    }));
    expect(changed.mode).toBe("kiosk");
    expect(changed.roomIds).toEqual([kids]);
    expect(changed.serviceTimeIds).toEqual([]);
  });

  it("leaves the rooms alone when the change does not mention them", async () => {
    const station = await run((tx) => addStation(tx, as(), { name: "Untouched", roomIds: [kids] }));
    const changed = await run((tx) => updateStation(tx, as(), station.id, { name: "Untouched renamed" }));
    expect(changed.roomIds).toEqual([kids]);
  });
});

describe("a device saying which station it is", () => {
  it("is recorded, so a church can see the device is alive", async () => {
    const station = await run((tx) => addStation(tx, as(), { name: "Tablet one" }));
    const claimed = await run((tx) => claimStation(tx, station.id));
    expect(claimed?.lastSeenAt).toBeInstanceOf(Date);
  });

  it("is refused for a station that has been retired", async () => {
    const station = await run((tx) => addStation(tx, as(), { name: "Old kiosk" }));
    await run((tx) => setStationArchived(tx, as(), station.id, true));

    expect(await run((tx) => claimStation(tx, station.id))).toBeNull();

    const open = await run((tx) => listStations(tx));
    expect(open.map((s) => s.name)).not.toContain("Old kiosk");

    await run((tx) => setStationArchived(tx, as(), station.id, false));
    expect(await run((tx) => claimStation(tx, station.id))).not.toBeNull();
  });
});

describe("who may set a station up", () => {
  it("is Owner and Admin, because a station decides where a child may go", () => {
    expect(canManageStations("owner")).toBe(true);
    expect(canManageStations("admin")).toBe(true);
    expect(canManageStations("staff")).toBe(false);
    expect(canManageStations("checkin_volunteer")).toBe(false);
  });

  it("refuses everybody else at the query layer", async () => {
    for (const role of ["staff", "pastoral", "checkin_volunteer"] as TenantRole[]) {
      await expect(
        run((tx) => addStation(tx, as(role), { name: `Station by ${role}` }), role),
      ).rejects.toBeInstanceOf(PermissionError);
    }
  });

  it("still lets a volunteer read one, because the station runs as them", async () => {
    const [station] = await run((tx) => listStations(tx), "checkin_volunteer");
    expect(station).toBeDefined();
    expect(await run((tx) => getStation(tx, station!.id), "checkin_volunteer")).not.toBeNull();
  });
});

describe("another church's stations", () => {
  it("cannot be seen or claimed", async () => {
    const [other] = await owner()<{ id: string }[]>`
      insert into tenants (slug, name, timezone)
      values ('stationtest2', 'Other Station Church', 'America/Chicago')
      returning id`;
    const otherId = other!.id;

    const theirs = await withTenant({ tenantId: otherId, role: "owner" }, (tx) =>
      addStation(tx, { tenantId: otherId, role: "owner" }, { name: "Their desk" }),
    );

    const mine = await run((tx) => listStations(tx, { includeArchived: true }));
    expect(mine.map((s) => s.name)).not.toContain("Their desk");
    expect(await run((tx) => claimStation(tx, theirs.id))).toBeNull();

    await withAuditTriggersOff(async () => {
      await owner()`delete from tenants where id = ${otherId}`;
    });
  });
});
