import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { checkinRooms } from "../schema/checkin";
import { PermissionError, type TenantRole } from "../roles";
import { can, rolesWith, type Who } from "../permissions";
import { InvalidInputError, NameTakenError } from "../errors";
import type { MessageKey } from "@hearth/i18n";
import type { WriteActor } from "./people";
import { ageInMonths, suggestRoom } from "./age";

export { ageInMonths, suggestRoom };

/**
 * R8.14 to R8.17. The rooms children are checked into.
 *
 * Everything the station needs to decide where a child goes and whether it may
 * put them there. The decisions themselves live in the station; this is the
 * configuration behind them, and the age arithmetic they both depend on.
 */

/** Rooms are a safeguarding configuration, so they stay with Owner and Admin. */
export const CAN_MANAGE_ROOMS: readonly TenantRole[] = rolesWith("checkin.rooms");
export const canManageRooms = (role: Who): boolean => can(role, "checkin.rooms");

/** Matches the twelve hues in packages/ui, so a room can be told apart on a label. */
export const ROOM_HUES = [
  "rose", "coral", "amber", "citron", "fern", "jade",
  "teal", "sky", "indigo", "violet", "orchid", "clay",
] as const;
export type RoomHue = (typeof ROOM_HUES)[number];

export interface Room {
  id: string;
  name: string;
  hue: string;
  minAgeMonths: number | null;
  maxAgeMonths: number | null;
  capacity: number | null;
  ratio: number | null;
  /** R8.14. Whether this room holds children, and so carries the safeguarding rules. */
  forChildren: boolean;
  position: number;
  archivedAt: Date | null;
}

export interface RoomInput {
  name: string;
  hue?: string;
  minAgeMonths?: number | null;
  maxAgeMonths?: number | null;
  capacity?: number | null;
  ratio?: number | null;
  forChildren?: boolean;
}

const COLUMNS = {
  id: checkinRooms.id,
  name: checkinRooms.name,
  hue: checkinRooms.hue,
  minAgeMonths: checkinRooms.minAgeMonths,
  maxAgeMonths: checkinRooms.maxAgeMonths,
  capacity: checkinRooms.capacity,
  ratio: checkinRooms.ratio,
  forChildren: checkinRooms.forChildren,
  position: checkinRooms.position,
  archivedAt: checkinRooms.archivedAt,
};

export async function listRooms(
  db: Tx,
  opts: { includeArchived?: boolean } = {},
): Promise<Room[]> {
  const rows = await db
    .select(COLUMNS)
    .from(checkinRooms)
    .where(opts.includeArchived ? undefined : isNull(checkinRooms.archivedAt))
    .orderBy(asc(checkinRooms.position), asc(checkinRooms.name));
  return rows;
}

export async function getRoom(db: Tx, id: string): Promise<Room | null> {
  const [row] = await db.select(COLUMNS).from(checkinRooms).where(eq(checkinRooms.id, id)).limit(1);
  return row ?? null;
}

/** Trimmed, internal whitespace collapsed. */
const clean = (raw: string): string => raw.trim().replace(/\s+/g, " ");

function check(input: RoomInput): {
  name: string;
  hue: string;
  minAgeMonths: number | null;
  maxAgeMonths: number | null;
  capacity: number | null;
  ratio: number | null;
  forChildren: boolean;
} {
  const name = clean(input.name ?? "");
  if (!name) throw new InvalidInputError("room.error.name");
  if (name.length > 80) throw new InvalidInputError("room.error.nameLong");

  const hue = input.hue ?? "sky";
  if (!(ROOM_HUES as readonly string[]).includes(hue)) throw new InvalidInputError("room.error.hue");

  const bound = (value: number | null | undefined, key: MessageKey): number | null => {
    if (value === null || value === undefined) return null;
    if (!Number.isInteger(value) || value < 0 || value > 1200) throw new InvalidInputError(key);
    return value;
  };

  const minAgeMonths = bound(input.minAgeMonths, "room.error.age");
  const maxAgeMonths = bound(input.maxAgeMonths, "room.error.age");
  if (minAgeMonths !== null && maxAgeMonths !== null && maxAgeMonths <= minAgeMonths) {
    throw new InvalidInputError("room.error.range");
  }

  const positive = (value: number | null | undefined, key: MessageKey): number | null => {
    if (value === null || value === undefined) return null;
    if (!Number.isInteger(value) || value < 1 || value > 10000) throw new InvalidInputError(key);
    return value;
  };

  return {
    name,
    hue,
    minAgeMonths,
    maxAgeMonths,
    capacity: positive(input.capacity, "room.error.capacity"),
    ratio: positive(input.ratio, "room.error.ratio"),
    // R8.14. Children unless a church says otherwise: the safeguarding rules
    // are the safe default, and an adult room is the exception a church states.
    forChildren: input.forChildren ?? true,
  };
}

/** The id of the room already holding this name, ignoring case. */
async function nameTaken(db: Tx, name: string, exceptId?: string): Promise<string | null> {
  const [row] = await db
    .select({ id: checkinRooms.id })
    .from(checkinRooms)
    .where(sql`lower(${checkinRooms.name}) = lower(${name})`)
    .limit(1);
  if (!row || row.id === exceptId) return null;
  return row.id;
}

export async function addRoom(db: Tx, actor: WriteActor, input: RoomInput): Promise<Room> {
  if (!canManageRooms(actor.role)) throw new PermissionError(actor.role, "manageRooms");
  const values = check(input);
  const clash = await nameTaken(db, values.name);
  if (clash) throw new NameTakenError("room.error.taken", values.name, clash);

  const [last] = await db
    .select({ next: sql<number>`coalesce(max(${checkinRooms.position}), -1) + 1` })
    .from(checkinRooms);

  const [row] = await db
    .insert(checkinRooms)
    .values({ tenantId: actor.tenantId, ...values, position: Number(last?.next ?? 0) })
    .returning(COLUMNS);
  return row!;
}

export async function updateRoom(
  db: Tx,
  actor: WriteActor,
  id: string,
  input: RoomInput,
): Promise<Room> {
  if (!canManageRooms(actor.role)) throw new PermissionError(actor.role, "manageRooms");
  const values = check(input);
  const clash = await nameTaken(db, values.name, id);
  if (clash) throw new NameTakenError("room.error.taken", values.name, clash);

  const [row] = await db
    .update(checkinRooms)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(checkinRooms.id, id))
    .returning(COLUMNS);
  if (!row) throw new InvalidInputError("room.error.missing");
  return row;
}

/**
 * A room that closes is archived. Its attendance and its incident reports point
 * at it for years, and a church that reopens the toddler room in September
 * wants the same room back.
 */
export async function setRoomArchived(
  db: Tx,
  actor: WriteActor,
  id: string,
  archived: boolean,
): Promise<Room> {
  if (!canManageRooms(actor.role)) throw new PermissionError(actor.role, "manageRooms");
  const [row] = await db
    .update(checkinRooms)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(checkinRooms.id, id))
    .returning(COLUMNS);
  if (!row) throw new InvalidInputError("room.error.missing");
  return row;
}

/** Drag order, applied in one statement so a half-applied order cannot happen. */
export async function orderRooms(db: Tx, actor: WriteActor, ids: string[]): Promise<void> {
  if (!canManageRooms(actor.role)) throw new PermissionError(actor.role, "manageRooms");
  if (ids.length === 0) return;
  for (const [position, id] of ids.entries()) {
    await db
      .update(checkinRooms)
      .set({ position, updatedAt: new Date() })
      .where(and(eq(checkinRooms.id, id)));
  }
}
