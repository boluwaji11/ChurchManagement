import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { checkinStations, checkinStationRooms, checkinStationServices, checkinRooms } from "../schema/checkin";
import { serviceTimes } from "../schema/tenancy";
import { PermissionError, type TenantRole } from "../roles";
import { can, rolesWith, type Who } from "../permissions";
import { InvalidInputError, NameTakenError } from "../errors";
import type { WriteActor } from "./members";

/**
 * R8.1, R8.2. Stations: the devices a church checks members in on.
 *
 * A station is an identity, and it exists for three reasons that a device
 * cannot answer on its own. It says what prints the labels, because the lobby
 * tablet drives a label printer and a parent's phone prints nothing. It is what
 * a block of offline security codes is issued to, because two tablets with no
 * network must not print the same code on two children (R8.21). And it is what
 * a visit records, so the answer to "who checked this child in" is a place
 * somebody can walk to.
 *
 * It is deliberately three questions and no more: a name, whether a volunteer
 * runs it or a family does, and what prints. A station is also replaceable: a
 * tablet that dies at 09:40 is replaced by pointing another one at the same
 * station.
 */

/** Stations decide which children may be checked into which room, so this is Owner and Admin. */
export const CAN_MANAGE_STATIONS: readonly TenantRole[] = rolesWith("checkin.stations");
export const canManageStations = (role: Who): boolean =>
  can(role, "checkin.stations");

/**
 * Two modes, because there are two screens.
 *
 * `desk` a volunteer drives, with undo and checkout in reach. `kiosk` a family
 * drives itself, which is the same flow with everything a parent has no
 * business touching taken away. A phone and a tablet on a stand are both the
 * second one, and a volunteer carrying a tablet is the first.
 */
export const STATION_MODES = ["desk", "kiosk"] as const;
export type StationMode = (typeof STATION_MODES)[number];

/** What prints the labels. Plain paper is a church with no label printer yet. */
export const STATION_PRINTERS = ["paper", "brother", "dymo"] as const;
export type StationPrinter = (typeof STATION_PRINTERS)[number];

export interface Station {
  id: string;
  name: string;
  mode: string;
  printer: string;
  lastSeenAt: Date | null;
  archivedAt: Date | null;
  /** Empty means every room. */
  roomIds: string[];
  /** Empty means every service. */
  serviceTimeIds: string[];
}

export interface StationInput {
  name: string;
  mode?: string;
  printer?: string;
  roomIds?: string[];
  serviceTimeIds?: string[];
}

const COLUMNS = {
  id: checkinStations.id,
  name: checkinStations.name,
  mode: checkinStations.mode,
  printer: checkinStations.printer,
  lastSeenAt: checkinStations.lastSeenAt,
  archivedAt: checkinStations.archivedAt,
};

const clean = (raw: string): string => raw.trim().replace(/\s+/g, " ");

function check(input: StationInput): { name: string; mode: string; printer: string } {
  const name = clean(input.name ?? "");
  if (!name) throw new InvalidInputError("station.error.name");
  if (name.length > 80) throw new InvalidInputError("station.error.nameLong");

  const mode = input.mode ?? "desk";
  if (!(STATION_MODES as readonly string[]).includes(mode)) {
    throw new InvalidInputError("station.error.mode");
  }

  const printer = input.printer ?? "paper";
  if (!(STATION_PRINTERS as readonly string[]).includes(printer)) {
    throw new InvalidInputError("station.error.printer");
  }

  return { name, mode, printer };
}

async function nameTaken(db: Tx, name: string, exceptId?: string): Promise<string | null> {
  const [row] = await db
    .select({ id: checkinStations.id })
    .from(checkinStations)
    .where(sql`lower(${checkinStations.name}) = lower(${name})`)
    .limit(1);
  if (!row || row.id === exceptId) return null;
  return row.id;
}

/**
 * The rooms and services a station is limited to.
 *
 * A row naming something archived or deleted is dropped rather than refused: a
 * church that archives a room should not find its stations refusing to save.
 */
async function setLinks(
  db: Tx,
  actor: WriteActor,
  stationId: string,
  roomIds: string[] | undefined,
  serviceTimeIds: string[] | undefined,
): Promise<void> {
  if (roomIds) {
    await db.delete(checkinStationRooms).where(eq(checkinStationRooms.stationId, stationId));
    const valid = roomIds.length
      ? (await db.select({ id: checkinRooms.id }).from(checkinRooms).where(inArray(checkinRooms.id, roomIds)))
          .map((r) => r.id)
      : [];
    if (valid.length) {
      await db.insert(checkinStationRooms).values(
        valid.map((roomId) => ({ tenantId: actor.tenantId, stationId, roomId })),
      );
    }
  }

  if (serviceTimeIds) {
    await db.delete(checkinStationServices).where(eq(checkinStationServices.stationId, stationId));
    const valid = serviceTimeIds.length
      ? (await db.select({ id: serviceTimes.id }).from(serviceTimes).where(inArray(serviceTimes.id, serviceTimeIds)))
          .map((r) => r.id)
      : [];
    if (valid.length) {
      await db.insert(checkinStationServices).values(
        valid.map((serviceTimeId) => ({ tenantId: actor.tenantId, stationId, serviceTimeId })),
      );
    }
  }
}

type StationRow = Omit<Station, "roomIds" | "serviceTimeIds">;

async function withLinks(db: Tx, rows: StationRow[]): Promise<Station[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const rooms = await db
    .select({ stationId: checkinStationRooms.stationId, roomId: checkinStationRooms.roomId })
    .from(checkinStationRooms)
    .where(inArray(checkinStationRooms.stationId, ids));

  const services = await db
    .select({ stationId: checkinStationServices.stationId, serviceTimeId: checkinStationServices.serviceTimeId })
    .from(checkinStationServices)
    .where(inArray(checkinStationServices.stationId, ids));

  return rows.map((row) => ({
    ...row,
    roomIds: rooms.filter((r) => r.stationId === row.id).map((r) => r.roomId),
    serviceTimeIds: services.filter((s) => s.stationId === row.id).map((s) => s.serviceTimeId),
  }));
}

export async function listStations(
  db: Tx,
  opts: { includeArchived?: boolean; archivedOnly?: boolean } = {},
): Promise<Station[]> {
  const rows = await db
    .select(COLUMNS)
    .from(checkinStations)
    .where(
      opts.archivedOnly
        ? sql`${checkinStations.archivedAt} is not null`
        : opts.includeArchived
          ? undefined
          : isNull(checkinStations.archivedAt),
    )
    .orderBy(asc(checkinStations.name));
  return withLinks(db, rows);
}

/** R8.1. How many stations have been put away, for the link that goes to them. */
export async function countArchivedStations(db: Tx): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(checkinStations)
    .where(sql`${checkinStations.archivedAt} is not null`);
  return row?.count ?? 0;
}

export async function getStation(db: Tx, id: string): Promise<Station | null> {
  const [row] = await db.select(COLUMNS).from(checkinStations).where(eq(checkinStations.id, id)).limit(1);
  if (!row) return null;
  return (await withLinks(db, [row]))[0]!;
}

export async function addStation(db: Tx, actor: WriteActor, input: StationInput): Promise<Station> {
  if (!canManageStations(actor)) throw new PermissionError(actor.role, "manageStations");
  const values = check(input);
  const clash = await nameTaken(db, values.name);
  if (clash) throw new NameTakenError("station.error.taken", values.name, clash);

  const [row] = await db
    .insert(checkinStations)
    .values({ tenantId: actor.tenantId, ...values })
    .returning(COLUMNS);

  await setLinks(db, actor, row!.id, input.roomIds ?? [], input.serviceTimeIds ?? []);
  return (await getStation(db, row!.id))!;
}

export async function updateStation(
  db: Tx,
  actor: WriteActor,
  id: string,
  input: StationInput,
): Promise<Station> {
  if (!canManageStations(actor)) throw new PermissionError(actor.role, "manageStations");
  const values = check(input);
  const clash = await nameTaken(db, values.name, id);
  if (clash) throw new NameTakenError("station.error.taken", values.name, clash);

  const [row] = await db
    .update(checkinStations)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(checkinStations.id, id))
    .returning(COLUMNS);
  if (!row) throw new InvalidInputError("station.error.missing");

  await setLinks(db, actor, id, input.roomIds, input.serviceTimeIds);
  return (await getStation(db, id))!;
}

export async function setStationArchived(
  db: Tx,
  actor: WriteActor,
  id: string,
  archived: boolean,
): Promise<Station> {
  if (!canManageStations(actor)) throw new PermissionError(actor.role, "manageStations");
  const [row] = await db
    .update(checkinStations)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(checkinStations.id, id))
    .returning(COLUMNS);
  if (!row) throw new InvalidInputError("station.error.missing");
  return (await getStation(db, id))!;
}

/**
 * A device saying which station it is.
 *
 * Refuses an archived station, so a device pointed at one that has been retired
 * is told to choose again rather than quietly checking children in against a
 * configuration nobody maintains.
 */
export async function claimStation(db: Tx, id: string): Promise<Station | null> {
  const [row] = await db
    .update(checkinStations)
    .set({ lastSeenAt: new Date() })
    .where(and(eq(checkinStations.id, id), isNull(checkinStations.archivedAt)))
    .returning(COLUMNS);
  if (!row) return null;
  return (await withLinks(db, [row]))[0]!;
}

/**
 * The rooms this station may check into, in the order the church put them.
 * A station naming none serves every room the church has open.
 */
export async function roomsForStation(db: Tx, station: Station) {
  const rows = await db
    .select({
      id: checkinRooms.id,
      name: checkinRooms.name,
      hue: checkinRooms.hue,
      minAgeMonths: checkinRooms.minAgeMonths,
      maxAgeMonths: checkinRooms.maxAgeMonths,
      capacity: checkinRooms.capacity,
      ratio: checkinRooms.ratio,
      position: checkinRooms.position,
      archivedAt: checkinRooms.archivedAt,
    })
    .from(checkinRooms)
    .where(isNull(checkinRooms.archivedAt))
    .orderBy(asc(checkinRooms.position), asc(checkinRooms.name));

  if (station.roomIds.length === 0) return rows;
  return rows.filter((r) => station.roomIds.includes(r.id));
}
