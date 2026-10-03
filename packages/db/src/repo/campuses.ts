import { and, asc, eq, ne, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { campuses, locations } from "../schema/tenancy";
import { PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import { canManageChurch } from "./church";
import type { WriteActor } from "./people";

/**
 * R1.2. Campuses and the places inside them.
 *
 * The UI is single-campus and says nothing about campuses anywhere, which is
 * the settled decision: a church of 180 does not have a second site, and a
 * picker that always reads the same thing is a question with one answer.
 *
 * What the schema carries is the shape a second site would need, filled in from
 * the first day by a trigger, so a multi-campus release has data rather than a
 * column of nulls to guess at.
 *
 * Locations are the part a single-campus church does use. "The Hall", "The
 * Annexe", "Room 2": the places a service or a group meets, named once and
 * picked from a list rather than typed differently every time.
 */

export interface Campus {
  id: string;
  name: string;
  isPrimary: boolean;
}

export interface ChurchLocation {
  id: string;
  campusId: string;
  name: string;
}

const NAME_LIMIT = 80;

function checkName(raw: string | null | undefined): string {
  const name = raw?.trim().replace(/\s+/g, " ");
  if (!name) throw new InvalidInputError("place.error.name");
  return name.slice(0, NAME_LIMIT);
}

/**
 * R1.2. The campus everything belongs to until a church has more than one.
 *
 * Created with the church, so this returns one for any church that exists. The
 * null is for the impossible case, and callers that need it to be there say so.
 */
export async function primaryCampus(db: Tx): Promise<Campus | null> {
  const [row] = await db
    .select({ id: campuses.id, name: campuses.name, isPrimary: campuses.isPrimary })
    .from(campuses)
    .where(eq(campuses.isPrimary, true))
    .orderBy(asc(campuses.createdAt))
    .limit(1);
  return row ?? null;
}

export async function listCampuses(db: Tx): Promise<Campus[]> {
  return db
    .select({ id: campuses.id, name: campuses.name, isPrimary: campuses.isPrimary })
    .from(campuses)
    .orderBy(sql`${campuses.isPrimary} desc`, asc(campuses.name));
}

/** R1.2. Renames the campus, which a church sees as renaming where it meets. */
export async function renameCampus(
  db: Tx,
  actor: WriteActor,
  id: string,
  name: string,
): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "editChurch");

  const changed = await db
    .update(campuses)
    .set({ name: checkName(name) })
    .where(eq(campuses.id, id))
    .returning({ id: campuses.id });
  if (changed.length === 0) throw new InvalidInputError("place.error.missing");
}

/** R1.2. The places this church meets in, by name. */
export async function listLocations(db: Tx): Promise<ChurchLocation[]> {
  return db
    .select({ id: locations.id, campusId: locations.campusId, name: locations.name })
    .from(locations)
    .orderBy(asc(locations.name));
}

export async function addLocation(
  db: Tx,
  actor: WriteActor,
  name: string,
  campusId?: string | null,
): Promise<{ id: string }> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "editChurch");
  const clean = checkName(name);

  const campus = campusId ?? (await primaryCampus(db))?.id;
  if (!campus) throw new InvalidInputError("place.error.campus");

  const [clash] = await db
    .select({ id: locations.id })
    .from(locations)
    .where(and(eq(locations.campusId, campus), eq(locations.name, clean)))
    .limit(1);
  if (clash) throw new InvalidInputError("place.error.taken");

  const [row] = await db
    .insert(locations)
    .values({ tenantId: actor.tenantId, campusId: campus, name: clean })
    .returning({ id: locations.id });
  return { id: row!.id };
}

export async function renameLocation(
  db: Tx,
  actor: WriteActor,
  id: string,
  name: string,
): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "editChurch");
  const clean = checkName(name);

  const [current] = await db
    .select({ campusId: locations.campusId })
    .from(locations)
    .where(eq(locations.id, id))
    .limit(1);
  if (!current) throw new InvalidInputError("place.error.missing");

  const [clash] = await db
    .select({ id: locations.id })
    .from(locations)
    .where(and(
      eq(locations.campusId, current.campusId),
      eq(locations.name, clean),
      ne(locations.id, id),
    ))
    .limit(1);
  if (clash) throw new InvalidInputError("place.error.taken");

  await db.update(locations).set({ name: clean }).where(eq(locations.id, id));
}

/**
 * R1.2. Removes a place.
 *
 * Deleted rather than archived, because a location is a label on a map rather
 * than a record of something that happened. Whatever was written down as
 * meeting there keeps the words it was written with.
 */
export async function removeLocation(db: Tx, actor: WriteActor, id: string): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "editChurch");

  const removed = await db
    .delete(locations)
    .where(eq(locations.id, id))
    .returning({ id: locations.id });
  if (removed.length === 0) throw new InvalidInputError("place.error.missing");
}
