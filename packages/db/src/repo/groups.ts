import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { groups, groupTypes, groupMemberships } from "../schema/groups";
import { people } from "../schema/people";
import { PermissionError, type TenantRole } from "../roles";
import { InvalidInputError, NameTakenError } from "../errors";
import type { WriteActor } from "./people";

/**
 * R9.1 to R9.4. Groups.
 *
 * Where the church happens between Sundays. The record is deliberately small:
 * what it is called, what kind it is, when and where it meets, who leads it and
 * who is in it. Everything a group could have and most groups will not is left
 * out, because a leader with four hours a week fills in a short form and
 * abandons a long one.
 *
 * Leaving a group is a date rather than a deletion. A church that loses the
 * record of who was in a group last year has lost the only evidence it has of
 * how somebody was discipled.
 */

/** Groups are pastoral structure, so creating and editing one is staff and up. */
export const CAN_MANAGE_GROUPS: readonly TenantRole[] = ["owner", "admin", "staff", "pastoral"];
export const canManageGroups = (role: TenantRole): boolean => CAN_MANAGE_GROUPS.includes(role);

/** R9.4. What somebody is in a group. */
export const GROUP_ROLES = ["leader", "coleader", "member"] as const;
export type GroupRole = (typeof GROUP_ROLES)[number];

/** R9.2. How often it meets, where it meets on a pattern at all. */
export const GROUP_FREQUENCIES = ["weekly", "fortnightly", "monthly"] as const;
export type GroupFrequency = (typeof GROUP_FREQUENCIES)[number];

/** R9.1. What a church starts with, and may rename or add to. */
export const DEFAULT_GROUP_TYPES = [
  { name: "Small group", hue: "sky" },
  { name: "Ministry team", hue: "fern" },
  { name: "Class", hue: "violet" },
  { name: "Committee", hue: "amber" },
  { name: "Other", hue: "stone" },
] as const;

export interface GroupType {
  id: string;
  name: string;
  hue: string;
  position: number;
  archivedAt: Date | null;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  typeId: string | null;
  typeName: string | null;
  typeHue: string | null;
  dayOfWeek: number | null;
  startsAt: string | null;
  frequency: string | null;
  location: string | null;
  capacity: number | null;
  openToJoin: boolean;
  listed: boolean;
  archivedAt: Date | null;
  /** Live members, including the leaders. */
  memberCount: number;
  /** R9.3. Who leads it, for a list that has to say so without a second query. */
  leaders: { personId: string; name: string }[];
}

export interface GroupInput {
  name: string;
  description?: string | null;
  typeId?: string | null;
  dayOfWeek?: number | null;
  startsAt?: string | null;
  frequency?: string | null;
  location?: string | null;
  capacity?: number | null;
  openToJoin?: boolean;
  listed?: boolean;
}

export interface GroupMember {
  id: string;
  personId: string;
  name: string;
  role: string;
  joinedOn: string;
  leftOn: string | null;
}

const clean = (raw: string | null | undefined): string => (raw ?? "").trim().replace(/\s+/g, " ");
const text = (raw: string | null | undefined): string | null => {
  const value = (raw ?? "").trim();
  return value === "" ? null : value;
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const called = (row: { firstName: string; lastName: string; preferredName: string | null }) =>
  `${row.preferredName?.trim() || row.firstName} ${row.lastName}`;

/* ------------------------------------------------------------------ types */

export async function listGroupTypes(
  db: Tx,
  opts: { includeArchived?: boolean } = {},
): Promise<GroupType[]> {
  const rows = await db
    .select({
      id: groupTypes.id,
      name: groupTypes.name,
      hue: groupTypes.hue,
      position: groupTypes.position,
      archivedAt: groupTypes.archivedAt,
    })
    .from(groupTypes)
    .where(opts.includeArchived ? undefined : isNull(groupTypes.archivedAt))
    .orderBy(asc(groupTypes.position), asc(groupTypes.name));
  return rows;
}

export async function addGroupType(
  db: Tx,
  actor: WriteActor,
  input: { name: string; hue?: string },
): Promise<GroupType> {
  if (!canManageGroups(actor.role)) throw new PermissionError(actor.role, "manageGroups");

  const name = clean(input.name);
  if (!name) throw new InvalidInputError("groupType.error.name");

  const [taken] = await db
    .select({ id: groupTypes.id })
    .from(groupTypes)
    .where(sql`lower(${groupTypes.name}) = lower(${name})`)
    .limit(1);
  if (taken) throw new NameTakenError("groupType.error.taken", name, taken.id);

  const [last] = await db
    .select({ position: groupTypes.position })
    .from(groupTypes)
    .orderBy(desc(groupTypes.position))
    .limit(1);

  const [row] = await db
    .insert(groupTypes)
    .values({
      tenantId: actor.tenantId,
      name,
      hue: input.hue ?? "sky",
      position: (last?.position ?? -1) + 1,
    })
    .returning({
      id: groupTypes.id,
      name: groupTypes.name,
      hue: groupTypes.hue,
      position: groupTypes.position,
      archivedAt: groupTypes.archivedAt,
    });

  return row!;
}

/** R9.1. The five a church starts with. Run once, when the church is created. */
export async function seedGroupTypes(db: Tx, actor: WriteActor): Promise<GroupType[]> {
  const existing = await listGroupTypes(db, { includeArchived: true });
  if (existing.length > 0) return existing;

  for (const [index, type] of DEFAULT_GROUP_TYPES.entries()) {
    await db.insert(groupTypes).values({
      tenantId: actor.tenantId,
      name: type.name,
      hue: type.hue,
      position: index,
    });
  }
  return listGroupTypes(db);
}

/* ----------------------------------------------------------------- groups */

function check(input: GroupInput): {
  name: string;
  description: string | null;
  dayOfWeek: number | null;
  startsAt: string | null;
  frequency: string | null;
  location: string | null;
  capacity: number | null;
} {
  const name = clean(input.name);
  if (!name) throw new InvalidInputError("group.error.name");
  if (name.length > 120) throw new InvalidInputError("group.error.nameLong");

  const day = input.dayOfWeek ?? null;
  if (day !== null && (!Number.isInteger(day) || day < 0 || day > 6)) {
    throw new InvalidInputError("group.error.day");
  }

  const startsAt = text(input.startsAt);
  if (startsAt !== null && !TIME.test(startsAt)) throw new InvalidInputError("group.error.time");

  const frequency = text(input.frequency);
  if (frequency !== null && !(GROUP_FREQUENCIES as readonly string[]).includes(frequency)) {
    throw new InvalidInputError("group.error.frequency");
  }

  const capacity = input.capacity ?? null;
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) {
    throw new InvalidInputError("group.error.capacity");
  }

  return {
    name,
    description: text(input.description),
    dayOfWeek: day,
    startsAt,
    frequency,
    location: text(input.location),
    capacity,
  };
}

async function hydrate(db: Tx, rows: { id: string }[]): Promise<Map<string, {
  memberCount: number;
  leaders: { personId: string; name: string }[];
}>> {
  const out = new Map<string, { memberCount: number; leaders: { personId: string; name: string }[] }>();
  if (rows.length === 0) return out;

  const ids = rows.map((r) => r.id);
  const members = await db
    .select({
      groupId: groupMemberships.groupId,
      personId: groupMemberships.personId,
      role: groupMemberships.role,
      firstName: people.firstName,
      lastName: people.lastName,
      preferredName: people.preferredName,
    })
    .from(groupMemberships)
    .innerJoin(people, eq(people.id, groupMemberships.personId))
    .where(and(inArray(groupMemberships.groupId, ids), isNull(groupMemberships.leftOn)));

  for (const id of ids) out.set(id, { memberCount: 0, leaders: [] });

  for (const row of members) {
    const entry = out.get(row.groupId);
    if (!entry) continue;
    entry.memberCount += 1;
    if (row.role === "leader" || row.role === "coleader") {
      entry.leaders.push({ personId: row.personId, name: called(row) });
    }
  }

  for (const entry of out.values()) {
    entry.leaders.sort((a, b) => a.name.localeCompare(b.name));
  }

  return out;
}

const COLUMNS = {
  id: groups.id,
  name: groups.name,
  description: groups.description,
  typeId: groups.typeId,
  dayOfWeek: groups.dayOfWeek,
  startsAt: groups.startsAt,
  frequency: groups.frequency,
  location: groups.location,
  capacity: groups.capacity,
  openToJoin: groups.openToJoin,
  listed: groups.listed,
  archivedAt: groups.archivedAt,
  typeName: groupTypes.name,
  typeHue: groupTypes.hue,
};

export async function listGroups(
  db: Tx,
  opts: { includeArchived?: boolean; typeId?: string; dayOfWeek?: number } = {},
): Promise<Group[]> {
  const wheres = [
    opts.includeArchived ? undefined : isNull(groups.archivedAt),
    opts.typeId ? eq(groups.typeId, opts.typeId) : undefined,
    opts.dayOfWeek !== undefined ? eq(groups.dayOfWeek, opts.dayOfWeek) : undefined,
  ].filter(Boolean);

  const rows = await db
    .select(COLUMNS)
    .from(groups)
    .leftJoin(groupTypes, eq(groupTypes.id, groups.typeId))
    .where(wheres.length ? and(...(wheres as never[])) : undefined)
    .orderBy(asc(groups.name));

  const extra = await hydrate(db, rows);
  return rows.map((row) => ({
    ...row,
    memberCount: extra.get(row.id)?.memberCount ?? 0,
    leaders: extra.get(row.id)?.leaders ?? [],
  }));
}

export async function getGroup(db: Tx, id: string): Promise<Group | null> {
  const [row] = await db
    .select(COLUMNS)
    .from(groups)
    .leftJoin(groupTypes, eq(groupTypes.id, groups.typeId))
    .where(eq(groups.id, id))
    .limit(1);
  if (!row) return null;

  const extra = await hydrate(db, [row]);
  return {
    ...row,
    memberCount: extra.get(row.id)?.memberCount ?? 0,
    leaders: extra.get(row.id)?.leaders ?? [],
  };
}

export async function createGroup(db: Tx, actor: WriteActor, input: GroupInput): Promise<Group> {
  if (!canManageGroups(actor.role)) throw new PermissionError(actor.role, "manageGroups");
  const values = check(input);

  const [taken] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(sql`lower(${groups.name}) = lower(${values.name})`)
    .limit(1);
  if (taken) throw new NameTakenError("group.error.taken", values.name, taken.id);

  const [row] = await db
    .insert(groups)
    .values({
      tenantId: actor.tenantId,
      typeId: input.typeId ?? null,
      openToJoin: input.openToJoin ?? true,
      listed: input.listed ?? true,
      ...values,
    })
    .returning({ id: groups.id });

  return (await getGroup(db, row!.id))!;
}

export async function updateGroup(
  db: Tx,
  actor: WriteActor,
  id: string,
  input: GroupInput,
): Promise<Group> {
  if (!canManageGroups(actor.role)) throw new PermissionError(actor.role, "manageGroups");
  const values = check(input);

  const [taken] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(sql`lower(${groups.name}) = lower(${values.name})`)
    .limit(1);
  if (taken && taken.id !== id) {
    throw new NameTakenError("group.error.taken", values.name, taken.id);
  }

  const updated = await db
    .update(groups)
    .set({
      typeId: input.typeId ?? null,
      openToJoin: input.openToJoin ?? true,
      listed: input.listed ?? true,
      ...values,
      updatedAt: new Date(),
    })
    .where(eq(groups.id, id))
    .returning({ id: groups.id });
  if (updated.length === 0) throw new InvalidInputError("group.error.missing");

  return (await getGroup(db, id))!;
}

/**
 * Archiving a group.
 *
 * Its roster and its attendance stay where they are. A group that ran for three
 * years and stopped is part of how this church has discipled people, and the
 * only honest way to end it is to stop it appearing in the lists.
 */
export async function setGroupArchived(
  db: Tx,
  actor: WriteActor,
  id: string,
  archived: boolean,
): Promise<Group> {
  if (!canManageGroups(actor.role)) throw new PermissionError(actor.role, "manageGroups");

  const updated = await db
    .update(groups)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(groups.id, id))
    .returning({ id: groups.id });
  if (updated.length === 0) throw new InvalidInputError("group.error.missing");

  return (await getGroup(db, id))!;
}

/* ---------------------------------------------------------------- roster */

/** R9.4. The roster. Live members first, then everybody who has left. */
export async function groupRoster(
  db: Tx,
  groupId: string,
  opts: { includePast?: boolean } = {},
): Promise<GroupMember[]> {
  const rows = await db
    .select({
      id: groupMemberships.id,
      personId: groupMemberships.personId,
      role: groupMemberships.role,
      joinedOn: sql<string>`${groupMemberships.joinedOn}::text`,
      leftOn: sql<string | null>`${groupMemberships.leftOn}::text`,
      firstName: people.firstName,
      lastName: people.lastName,
      preferredName: people.preferredName,
    })
    .from(groupMemberships)
    .innerJoin(people, eq(people.id, groupMemberships.personId))
    .where(
      opts.includePast
        ? eq(groupMemberships.groupId, groupId)
        : and(eq(groupMemberships.groupId, groupId), isNull(groupMemberships.leftOn)),
    )
    .orderBy(asc(people.lastName), asc(people.firstName));

  const rank = (role: string) => (role === "leader" ? 0 : role === "coleader" ? 1 : 2);

  return rows
    .map((r) => ({
      id: r.id,
      personId: r.personId,
      name: called(r),
      role: r.role,
      joinedOn: r.joinedOn,
      leftOn: r.leftOn,
    }))
    .sort(
      (a, b) =>
        Number(Boolean(a.leftOn)) - Number(Boolean(b.leftOn)) ||
        rank(a.role) - rank(b.role) ||
        a.name.localeCompare(b.name),
    );
}

/**
 * R9.4. Putting somebody in a group.
 *
 * Joining twice is the same join: a person already in the group keeps the
 * membership they have, and their role is updated rather than doubled.
 */
export async function addToGroup(
  db: Tx,
  actor: WriteActor,
  input: { groupId: string; personId: string; role?: GroupRole; joinedOn?: string },
): Promise<GroupMember[]> {
  if (!canManageGroups(actor.role)) throw new PermissionError(actor.role, "manageGroups");

  const role = input.role ?? "member";
  if (!(GROUP_ROLES as readonly string[]).includes(role)) {
    throw new InvalidInputError("group.error.role");
  }

  const joinedOn = input.joinedOn ?? new Date().toISOString().slice(0, 10);
  if (!DATE.test(joinedOn)) throw new InvalidInputError("group.error.joined");

  const [person] = await db
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.id, input.personId), isNull(people.archivedAt)))
    .limit(1);
  if (!person) throw new InvalidInputError("group.error.person");

  const [already] = await db
    .select({ id: groupMemberships.id })
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, input.groupId),
        eq(groupMemberships.personId, input.personId),
        isNull(groupMemberships.leftOn),
      ),
    )
    .limit(1);

  if (already) {
    await db
      .update(groupMemberships)
      .set({ role, updatedAt: new Date() })
      .where(eq(groupMemberships.id, already.id));
  } else {
    await db.insert(groupMemberships).values({
      tenantId: actor.tenantId,
      groupId: input.groupId,
      personId: input.personId,
      role,
      joinedOn,
    });
  }

  return groupRoster(db, input.groupId);
}

/** R9.4. Somebody leaving. The row stays, with the day they went. */
export async function removeFromGroup(
  db: Tx,
  actor: WriteActor,
  input: { groupId: string; personId: string; leftOn?: string },
): Promise<GroupMember[]> {
  if (!canManageGroups(actor.role)) throw new PermissionError(actor.role, "manageGroups");

  const leftOn = input.leftOn ?? new Date().toISOString().slice(0, 10);
  if (!DATE.test(leftOn)) throw new InvalidInputError("group.error.left");

  await db
    .update(groupMemberships)
    .set({ leftOn, updatedAt: new Date() })
    .where(
      and(
        eq(groupMemberships.groupId, input.groupId),
        eq(groupMemberships.personId, input.personId),
        isNull(groupMemberships.leftOn),
      ),
    );

  return groupRoster(db, input.groupId);
}

/** Every group somebody is in now, for their record. */
export async function groupsForPerson(db: Tx, personId: string): Promise<
  { groupId: string; name: string; role: string; typeHue: string | null }[]
> {
  const rows = await db
    .select({
      groupId: groups.id,
      name: groups.name,
      role: groupMemberships.role,
      typeHue: groupTypes.hue,
    })
    .from(groupMemberships)
    .innerJoin(groups, eq(groups.id, groupMemberships.groupId))
    .leftJoin(groupTypes, eq(groupTypes.id, groups.typeId))
    .where(
      and(
        eq(groupMemberships.personId, personId),
        isNull(groupMemberships.leftOn),
        isNull(groups.archivedAt),
      ),
    )
    .orderBy(asc(groups.name));

  return rows;
}

/** R9.3. The groups this person leads, which is what scopes what they may see. */
export async function groupsLedBy(db: Tx, personId: string): Promise<string[]> {
  const rows = await db
    .select({ groupId: groupMemberships.groupId })
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.personId, personId),
        isNull(groupMemberships.leftOn),
        inArray(groupMemberships.role, ["leader", "coleader"]),
      ),
    );
  return rows.map((r) => r.groupId);
}
