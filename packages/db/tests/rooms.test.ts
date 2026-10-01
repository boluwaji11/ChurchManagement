/**
 * HRT-54. Rooms, their age ranges, capacity and ratios (R8.14 to R8.17).
 *
 * The acceptance criteria in docs/checkin-acceptance.md are the definition of
 * done here, ahead of anything the story says. This file covers the two of them
 * that belong to rooms rather than to the station: a suggestion comes from the
 * child's date of birth and is always overridable, and the numbers the station
 * warns and blocks on are the church's own.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { owner, withTenant, closeConnections, type Tx } from "../src/client";
import {
  addRoom, updateRoom, listRooms, getRoom, setRoomArchived, orderRooms,
  suggestRoom, ageInMonths, canManageRooms, type Room,
} from "../src/repo/rooms";
import { InvalidInputError, NameTakenError } from "../src/errors";
import { PermissionError, type TenantRole } from "../src/roles";
import { withAuditTriggersOff } from "../src/maintenance";

let tenant: string;

const as = (role: TenantRole = "owner") => ({ tenantId: tenant, role });
const run = <T>(work: (tx: Tx) => Promise<T>, role: TenantRole = "owner") =>
  withTenant({ tenantId: tenant, role }, work);

beforeAll(async () => {
  const [row] = await owner()<{ id: string }[]>`
    insert into tenants (slug, name, timezone)
    values ('roomtest', 'Room Test Church', 'America/Chicago')
    returning id`;
  tenant = row!.id;
});

afterAll(async () => {
  await withAuditTriggersOff(async (sql) => {
    await sql`delete from tenants where id = ${tenant}`;
  });
  await closeConnections();
});

describe("how old a child is", () => {
  it("counts whole months, and waits for the day of the month to pass", () => {
    expect(ageInMonths("2026-01-15", "2026-01-15")).toBe(0);
    expect(ageInMonths("2026-01-15", "2026-02-14")).toBe(0);
    expect(ageInMonths("2026-01-15", "2026-02-15")).toBe(1);
    expect(ageInMonths("2020-09-30", "2026-09-30")).toBe(72);
    expect(ageInMonths("2020-09-30", "2026-09-29")).toBe(71);
  });

  it("has no answer for a date that is not one, or a child not yet born", () => {
    expect(ageInMonths("", "2026-09-30")).toBeNull();
    expect(ageInMonths("2026-09-30", "not a date")).toBeNull();
    expect(ageInMonths("2027-01-01", "2026-09-30")).toBeNull();
  });
});

describe("which room a child belongs in", () => {
  const room = (over: Partial<Room>): Room => ({
    id: over.name ?? "r", name: "Room", hue: "sky",
    minAgeMonths: null, maxAgeMonths: null, capacity: null, ratio: null,
    position: 0, archivedAt: null, ...over,
  });

  const nursery = room({ name: "Nursery", minAgeMonths: 0, maxAgeMonths: 24, position: 0 });
  const toddlers = room({ name: "Toddlers", minAgeMonths: 24, maxAgeMonths: 48, position: 1 });
  const kids = room({ name: "Kids", minAgeMonths: 48, maxAgeMonths: 144, position: 2 });
  const rooms = [nursery, toddlers, kids];

  it("takes the room whose range holds the child", () => {
    expect(suggestRoom(rooms, 0)?.name).toBe("Nursery");
    expect(suggestRoom(rooms, 23)?.name).toBe("Nursery");
    expect(suggestRoom(rooms, 25)?.name).toBe("Toddlers");
    expect(suggestRoom(rooms, 100)?.name).toBe("Kids");
  });

  it("gives a month on a boundary to exactly one room", () => {
    // Inclusive at the bottom, exclusive at the top, so 0 to 24 and 24 to 48
    // tile with no month belonging to both rooms or to neither.
    expect(suggestRoom(rooms, 24)?.name).toBe("Toddlers");
    expect(suggestRoom(rooms, 48)?.name).toBe("Kids");
  });

  it("gives an overlap to the narrower room", () => {
    const babies = room({ name: "Babies", minAgeMonths: 0, maxAgeMonths: 12, position: 9 });
    expect(suggestRoom([nursery, babies], 6)?.name).toBe("Babies");
  });

  it("suggests nothing rather than guessing", () => {
    expect(suggestRoom(rooms, 200)).toBeNull();
    expect(suggestRoom(rooms, null)).toBeNull();
    expect(suggestRoom([], 12)).toBeNull();
  });

  it("never suggests an archived room", () => {
    const closed = room({ name: "Closed", minAgeMonths: 0, maxAgeMonths: 12, archivedAt: new Date() });
    expect(suggestRoom([closed], 6)).toBeNull();
  });

  it("takes a room with no range when nothing else fits", () => {
    const anyone = room({ name: "Anyone" });
    expect(suggestRoom([anyone], 300)?.name).toBe("Anyone");
    // A range beats no range, because the church said something about it.
    expect(suggestRoom([anyone, nursery], 6)?.name).toBe("Nursery");
  });
});

describe("keeping the rooms", () => {
  it("adds one, reads it back, and orders it last", async () => {
    const first = await run((tx) => addRoom(tx, as(), {
      name: "  Nursery  ", hue: "amber", minAgeMonths: 0, maxAgeMonths: 24, capacity: 12, ratio: 4,
    }));
    expect(first.name).toBe("Nursery");
    expect(first.position).toBe(0);

    const second = await run((tx) => addRoom(tx, as(), { name: "Toddlers", minAgeMonths: 24, maxAgeMonths: 48 }));
    expect(second.position).toBe(1);

    const back = await run((tx) => getRoom(tx, first.id));
    expect(back?.capacity).toBe(12);
    expect(back?.ratio).toBe(4);
    expect(back?.hue).toBe("amber");
  });

  it("refuses a second room of the same name, whatever the case", async () => {
    await expect(run((tx) => addRoom(tx, as(), { name: "nursery" }))).rejects.toBeInstanceOf(NameTakenError);
  });

  it("refuses the numbers that would make the station lie", async () => {
    const bad = [
      { name: "" },
      { name: "Upside down", minAgeMonths: 48, maxAgeMonths: 24 },
      { name: "Same", minAgeMonths: 24, maxAgeMonths: 24 },
      { name: "No room at all", capacity: 0 },
      { name: "Half a volunteer", ratio: 0 },
      { name: "Negative", minAgeMonths: -1 },
      { name: "Unknown colour", hue: "beige" },
    ];
    for (const input of bad) {
      await expect(run((tx) => addRoom(tx, as(), input)), input.name).rejects.toBeInstanceOf(InvalidInputError);
    }
  });

  it("lets a church say nothing about capacity or ratio", async () => {
    const room = await run((tx) => addRoom(tx, as(), { name: "Youth" }));
    expect(room.capacity).toBeNull();
    expect(room.ratio).toBeNull();
    expect(room.minAgeMonths).toBeNull();
  });

  it("changes one, and keeps its own name available to it", async () => {
    const [room] = await run((tx) => listRooms(tx));
    const changed = await run((tx) => updateRoom(tx, as(), room!.id, {
      name: room!.name, capacity: 20, ratio: 5, minAgeMonths: 0, maxAgeMonths: 18, hue: "jade",
    }));
    expect(changed.capacity).toBe(20);
    expect(changed.maxAgeMonths).toBe(18);
    expect(changed.hue).toBe("jade");
  });

  it("archives a room and brings it back", async () => {
    const room = await run((tx) => addRoom(tx, as(), { name: "Old hall" }));

    await run((tx) => setRoomArchived(tx, as(), room.id, true));
    const open = await run((tx) => listRooms(tx));
    expect(open.map((r) => r.name)).not.toContain("Old hall");

    const all = await run((tx) => listRooms(tx, { includeArchived: true }));
    expect(all.map((r) => r.name)).toContain("Old hall");

    await run((tx) => setRoomArchived(tx, as(), room.id, false));
    expect((await run((tx) => listRooms(tx))).map((r) => r.name)).toContain("Old hall");
  });

  it("puts them in the order the church asked for", async () => {
    const before = await run((tx) => listRooms(tx));
    const reversed = [...before].reverse().map((r) => r.id);
    await run((tx) => orderRooms(tx, as(), reversed));
    const after = await run((tx) => listRooms(tx));
    expect(after.map((r) => r.id)).toEqual(reversed);
  });
});

describe("who may change a room", () => {
  it("is Owner and Admin, because this is a safeguarding setting", () => {
    expect(canManageRooms("owner")).toBe(true);
    expect(canManageRooms("admin")).toBe(true);
    expect(canManageRooms("staff")).toBe(false);
    expect(canManageRooms("pastoral")).toBe(false);
    expect(canManageRooms("checkin_volunteer")).toBe(false);
  });

  it("refuses everybody else, at the query layer", async () => {
    for (const role of ["staff", "pastoral", "checkin_volunteer"] as TenantRole[]) {
      await expect(
        run((tx) => addRoom(tx, as(role), { name: `Room by ${role}` }), role),
      ).rejects.toBeInstanceOf(PermissionError);
    }
  });

  it("still lets anybody read them, because the station has to", async () => {
    const rooms = await run((tx) => listRooms(tx), "checkin_volunteer");
    expect(rooms.length).toBeGreaterThan(0);
  });
});

describe("another church's rooms", () => {
  it("cannot be seen", async () => {
    const [other] = await owner()<{ id: string }[]>`
      insert into tenants (slug, name, timezone)
      values ('roomtest2', 'Other Room Church', 'America/Chicago')
      returning id`;
    const otherId = other!.id;

    await withTenant({ tenantId: otherId, role: "owner" }, (tx) =>
      addRoom(tx, { tenantId: otherId, role: "owner" }, { name: "Their nursery" }),
    );

    const mine = await run((tx) => listRooms(tx, { includeArchived: true }));
    expect(mine.map((r) => r.name)).not.toContain("Their nursery");

    await withAuditTriggersOff(async (sql) => {
      await sql`delete from tenants where id = ${otherId}`;
    });
  });
});
