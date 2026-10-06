import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { groups, groupTypes, groupMemberships } from "../schema/groups";
import { members } from "../schema/members";
import { storedFiles } from "../schema/tenancy";
import { PermissionError, type TenantRole } from "../roles";
import { can, rolesWith, type Who } from "../permissions";
import { InvalidInputError, NameTakenError } from "../errors";
import type { WriteActor } from "./members";
import { formSlug, isUuid } from "./form-rules";
import { personForUser } from "./scope";

/**
 * R9.1 to R9.4. Groups.
 *
 * Where the church happens between services. The record is deliberately small:
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
/** R24.3. The spectrum, in the order a church's kinds take them. */
const NEXT_HUE = [
  "sky", "fern", "violet", "amber", "teal", "rose",
  "citron", "indigo", "coral", "jade", "orchid", "clay",
] as const;

export const CAN_MANAGE_GROUPS: readonly TenantRole[] = rolesWith("groups.manage");
export const canManageGroups = (role: Who): boolean => can(role, "groups.manage");

/** R9.4. What somebody is in a group. */
export const GROUP_ROLES = ["leader", "coleader", "member"] as const;
export type GroupRole = (typeof GROUP_ROLES)[number];

/** R9.2. How often it meets, where it meets on a pattern at all. */
export const GROUP_FREQUENCIES = ["weekly", "fortnightly", "monthly"] as const;
export type GroupFrequency = (typeof GROUP_FREQUENCIES)[number];

/**
 * R9.5. Who a group is for, as a church writes it on the poster.
 *
 * One field rather than a gender and an age range crossed together. A church
 * says "Young adults" or "Men"; it does not fill in two dropdowns to say it,
 * and a finder that asks somebody to is a finder members give up on.
 */
export const GROUP_AUDIENCES = [
  "anyone", "men", "women", "young_adults", "students", "parents", "seniors",
] as const;
export type GroupAudience = (typeof GROUP_AUDIENCES)[number];

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
  description: string | null;
  hue: string;
  position: number;
  archivedAt: Date | null;
}

export type GroupStatus = "draft" | "published";

export interface Group {
  id: string;
  name: string;
  /** R9.2. The readable part of its address. */
  slug: string;
  /** R9.5. Whether the open web can see it yet. */
  status: GroupStatus;
  description: string | null;
  typeId: string | null;
  typeName: string | null;
  typeHue: string | null;
  dayOfWeek: number | null;
  startsAt: string | null;
  endsAt: string | null;
  frequency: string | null;
  /** R9.2. The day it stops meeting, where it has one. */
  endsOn: string | null;
  location: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  capacity: number | null;
  forWhom: string | null;
  online: boolean;
  childrenWelcome: boolean;
  openToJoin: boolean;
  listed: boolean;
  archivedAt: Date | null;
  /** R9.2. The picture on the card, in the church bucket. */
  photoKey: string | null;
  /** Live members, including the leaders. */
  memberCount: number;
  /** R9.3. Who leads it, for a list that has to say so without a second query. */
  leaders: { memberId: string; name: string }[];
}

export interface GroupInput {
  name: string;
  description?: string | null;
  typeId?: string | null;
  dayOfWeek?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  frequency?: string | null;
  endsOn?: string | null;
  location?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  capacity?: number | null;
  forWhom?: string | null;
  online?: boolean;
  childrenWelcome?: boolean;
  openToJoin?: boolean;
  listed?: boolean;
}

export interface GroupMember {
  id: string;
  memberId: string;
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
      description: groupTypes.description,
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
  input: { name: string; hue?: string; description?: string | null },
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

  const position = (last?.position ?? -1) + 1;

  const [row] = await db
    .insert(groupTypes)
    .values({
      tenantId: actor.tenantId,
      name,
      description: input.description?.trim() || null,
      /*
       * R9.1, R24.3. Assigned rather than asked for.
       *
       * The colour is what tells a life group from a ministry team across the
       * finder, the calendar and a person's record. A church setting up has
       * better questions to answer than which of twelve, so the next one in
       * the spectrum is taken and the hues stay spread apart.
       */
      hue: input.hue ?? NEXT_HUE[position % NEXT_HUE.length]!,
      position,
    })
    .returning({
      id: groupTypes.id,
      name: groupTypes.name,
      description: groupTypes.description,
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
  endsAt: string | null;
  frequency: string | null;
  location: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  endsOn: string | null;
  capacity: number | null;
  forWhom: string | null;
} {
  const name = clean(input.name);
  if (!name) throw new InvalidInputError("group.error.name");
  if (name.length > 120) throw new InvalidInputError("group.error.nameLong");

  // R9.1. Every group is one of the kinds the church writes down, because the
  // kinds are how the finder, the filters and the public page are organised.
  if (!input.typeId) throw new InvalidInputError("group.error.type");

  const day = input.dayOfWeek ?? null;
  if (day !== null && (!Number.isInteger(day) || day < 0 || day > 6)) {
    throw new InvalidInputError("group.error.day");
  }

  const startsAt = text(input.startsAt);
  if (startsAt !== null && !TIME.test(startsAt)) throw new InvalidInputError("group.error.time");

  const endsAt = text(input.endsAt);
  if (endsAt !== null && !TIME.test(endsAt)) throw new InvalidInputError("group.error.time");
  if (startsAt !== null && endsAt !== null && endsAt <= startsAt) {
    throw new InvalidInputError("group.error.ends");
  }

  const forWhom = text(input.forWhom);
  if (forWhom !== null && !(GROUP_AUDIENCES as readonly string[]).includes(forWhom)) {
    throw new InvalidInputError("group.error.audience");
  }

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
    endsAt,
    frequency,
    endsOn: text(input.endsOn),
    location: text(input.location),
    addressLine1: text(input.addressLine1),
    addressLine2: text(input.addressLine2),
    city: text(input.city),
    region: text(input.region),
    postalCode: text(input.postalCode),
    country: text(input.country),
    capacity,
    forWhom,
  };
}

async function hydrate(db: Tx, rows: { id: string }[]): Promise<Map<string, {
  memberCount: number;
  leaders: { memberId: string; name: string }[];
}>> {
  const out = new Map<string, { memberCount: number; leaders: { memberId: string; name: string }[] }>();
  if (rows.length === 0) return out;

  const ids = rows.map((r) => r.id);
  const rostered = await db
    .select({
      groupId: groupMemberships.groupId,
      memberId: groupMemberships.memberId,
      role: groupMemberships.role,
      firstName: members.firstName,
      lastName: members.lastName,
      preferredName: members.preferredName,
    })
    .from(groupMemberships)
    .innerJoin(members, eq(members.id, groupMemberships.memberId))
    .where(and(inArray(groupMemberships.groupId, ids), isNull(groupMemberships.leftOn)));

  for (const id of ids) out.set(id, { memberCount: 0, leaders: [] });

  for (const row of rostered) {
    const entry = out.get(row.groupId);
    if (!entry) continue;
    entry.memberCount += 1;
    if (row.role === "leader" || row.role === "coleader") {
      entry.leaders.push({ memberId: row.memberId, name: called(row) });
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
  slug: groups.slug,
  status: sql<GroupStatus>`${groups.status}`,
  description: groups.description,
  typeId: groups.typeId,
  dayOfWeek: groups.dayOfWeek,
  startsAt: groups.startsAt,
  endsAt: groups.endsAt,
  frequency: groups.frequency,
  location: groups.location,
  addressLine1: groups.addressLine1,
  addressLine2: groups.addressLine2,
  city: groups.city,
  region: groups.region,
  postalCode: groups.postalCode,
  country: groups.country,
  endsOn: sql<string | null>`${groups.endsOn}::text`,
  capacity: groups.capacity,
  forWhom: groups.forWhom,
  online: groups.online,
  childrenWelcome: groups.childrenWelcome,
  openToJoin: groups.openToJoin,
  listed: groups.listed,
  archivedAt: groups.archivedAt,
  photoKey: groups.photoKey,
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

/**
 * R9.2. A readable address that is free, numbering a clash.
 *
 * Written once, when the group is created, and kept through every rename. A
 * link already sent out keeps working, and the id in the URL works too.
 */
async function freeSlug(db: Tx, name: string): Promise<string> {
  const base = formSlug(name);
  for (let n = 1; n < 200; n += 1) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const [clash] = await db
      .select({ id: groups.id })
      .from(groups)
      .where(eq(groups.slug, candidate))
      .limit(1);
    if (!clash) return candidate;
  }
  throw new InvalidInputError("group.error.taken");
}

/** R9.2. One group, found by its readable address or by its id. */
export async function getGroup(db: Tx, id: string): Promise<Group | null> {
  const [row] = await db
    .select(COLUMNS)
    .from(groups)
    .leftJoin(groupTypes, eq(groupTypes.id, groups.typeId))
    .where(isUuid(id) ? eq(groups.id, id) : eq(groups.slug, id))
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
      online: input.online ?? false,
      childrenWelcome: input.childrenWelcome ?? false,
      openToJoin: input.openToJoin ?? true,
      listed: input.listed ?? true,
      ...values,
      slug: await freeSlug(db, values.name),
      // R9.5. Written first, published when the church is ready.
      status: "draft",
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
      online: input.online ?? false,
      childrenWelcome: input.childrenWelcome ?? false,
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
 * R9.5. Whether the group is taking new members.
 *
 * Its own write rather than a trip through updateGroup, because this is one
 * press on the group's page and the rest of the record is not in hand.
 */
export async function setGroupOpen(
  db: Tx,
  actor: WriteActor,
  id: string,
  openToJoin: boolean,
): Promise<void> {
  if (!canManageGroups(actor.role)) throw new PermissionError(actor.role, "manageGroups");

  const changed = await db
    .update(groups)
    .set({ openToJoin, updatedAt: new Date() })
    .where(eq(groups.id, id))
    .returning({ id: groups.id });
  if (changed.length === 0) throw new InvalidInputError("group.error.missing");
}

/**
 * Archiving a group.
 *
 * Its roster and its attendance stay where they are. A group that ran for three
 * years and stopped is part of how this church has discipled members, and the
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
      memberId: groupMemberships.memberId,
      role: groupMemberships.role,
      joinedOn: sql<string>`${groupMemberships.joinedOn}::text`,
      leftOn: sql<string | null>`${groupMemberships.leftOn}::text`,
      firstName: members.firstName,
      lastName: members.lastName,
      preferredName: members.preferredName,
    })
    .from(groupMemberships)
    .innerJoin(members, eq(members.id, groupMemberships.memberId))
    .where(
      opts.includePast
        ? eq(groupMemberships.groupId, groupId)
        : and(eq(groupMemberships.groupId, groupId), isNull(groupMemberships.leftOn)),
    )
    .orderBy(asc(members.lastName), asc(members.firstName));

  const rank = (role: string) => (role === "leader" ? 0 : role === "coleader" ? 1 : 2);

  return rows
    .map((r) => ({
      id: r.id,
      memberId: r.memberId,
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
  input: { groupId: string; memberId: string; role?: GroupRole; joinedOn?: string },
): Promise<GroupMember[]> {
  if (!canManageGroups(actor.role)) throw new PermissionError(actor.role, "manageGroups");

  const role = input.role ?? "member";
  if (!(GROUP_ROLES as readonly string[]).includes(role)) {
    throw new InvalidInputError("group.error.role");
  }

  const joinedOn = input.joinedOn ?? new Date().toISOString().slice(0, 10);
  if (!DATE.test(joinedOn)) throw new InvalidInputError("group.error.joined");

  const [person] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.id, input.memberId), isNull(members.archivedAt)))
    .limit(1);
  if (!person) throw new InvalidInputError("group.error.person");

  const [already] = await db
    .select({ id: groupMemberships.id })
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, input.groupId),
        eq(groupMemberships.memberId, input.memberId),
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
      memberId: input.memberId,
      role,
      joinedOn,
    });
  }

  return groupRoster(db, input.groupId);
}

/**
 * R9.3. Whether this actor runs this particular group.
 *
 * A leader keeps their own roster. Whoever runs groups for the church keeps
 * everybody's. Written here rather than reached for from the attendance module,
 * which already imports this one.
 */
async function leadsGroup(
  db: Tx,
  actor: WriteActor,
  groupId: string,
): Promise<boolean> {
  if (!actor.userId) return false;
  const self = await personForUser(db, actor.userId);
  if (!self) return false;

  const [row] = await db
    .select({ id: groupMemberships.id })
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.memberId, self),
        isNull(groupMemberships.leftOn),
        inArray(groupMemberships.role, ["leader", "coleader"]),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/**
 * R9.3. Taking the last leader off a group is refused.
 *
 * It would leave a group nobody can record attendance for and nobody can be
 * asked about, so the church names a replacement first. Checked here rather
 * than only on screen, because the screen is not the control.
 */
async function wouldStrandGroup(
  db: Tx,
  groupId: string,
  memberId: string,
): Promise<boolean> {
  const leaders = await db
    .select({ memberId: groupMemberships.memberId })
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        isNull(groupMemberships.leftOn),
        inArray(groupMemberships.role, ["leader", "coleader"]),
      ),
    );
  return leaders.length === 1 && leaders[0]!.memberId === memberId;
}

/** The day somebody went, defaulting to today. */
function wentOn(given?: string): string {
  const leftOn = given ?? new Date().toISOString().slice(0, 10);
  if (!DATE.test(leftOn)) throw new InvalidInputError("group.error.left");
  return leftOn;
}

/** R9.4. Somebody leaving. The row stays, with the day they went. */
export async function removeFromGroup(
  db: Tx,
  actor: WriteActor,
  input: { groupId: string; memberId: string; leftOn?: string },
): Promise<GroupMember[]> {
  if (!canManageGroups(actor.role) && !(await leadsGroup(db, actor, input.groupId))) {
    throw new PermissionError(actor.role, "manageGroups");
  }

  const leftOn = wentOn(input.leftOn);
  if (await wouldStrandGroup(db, input.groupId, input.memberId)) {
    throw new InvalidInputError("group.error.lastLeader");
  }

  await db
    .update(groupMemberships)
    .set({ leftOn, updatedAt: new Date() })
    .where(
      and(
        eq(groupMemberships.groupId, input.groupId),
        eq(groupMemberships.memberId, input.memberId),
        isNull(groupMemberships.leftOn),
      ),
    );

  return groupRoster(db, input.groupId);
}

/**
 * R9.4, R17.5. Somebody taking themselves out of a group.
 *
 * Nobody needs a permission to leave something they joined, so this asks for
 * none. What it does not take is a member id: the person leaving is whoever is
 * signed in, so the request cannot reach anybody else's membership.
 *
 * The last leader is still refused. Somebody running the only group of its kind
 * cannot walk away from it without the church knowing, and the message says to
 * name a replacement.
 */
export async function leaveGroup(
  db: Tx,
  actor: WriteActor,
  input: { groupId: string; leftOn?: string },
): Promise<void> {
  if (!actor.userId) throw new InvalidInputError("member.error.noRecord");
  const self = await personForUser(db, actor.userId);
  if (!self) throw new InvalidInputError("member.error.noRecord");

  const leftOn = wentOn(input.leftOn);
  if (await wouldStrandGroup(db, input.groupId, self)) {
    throw new InvalidInputError("group.error.lastLeader");
  }

  const gone = await db
    .update(groupMemberships)
    .set({ leftOn, updatedAt: new Date() })
    .where(
      and(
        eq(groupMemberships.groupId, input.groupId),
        eq(groupMemberships.memberId, self),
        isNull(groupMemberships.leftOn),
      ),
    )
    .returning({ id: groupMemberships.id });

  if (gone.length === 0) throw new InvalidInputError("group.error.notIn");
}

/** Every group somebody is in now, for their record. */
export async function groupsForPerson(db: Tx, memberId: string): Promise<
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
        eq(groupMemberships.memberId, memberId),
        isNull(groupMemberships.leftOn),
        isNull(groups.archivedAt),
      ),
    )
    .orderBy(asc(groups.name));

  return rows;
}

/** R9.3. The groups this person leads, which is what scopes what they may see. */
export async function groupsLedBy(db: Tx, memberId: string): Promise<string[]> {
  const rows = await db
    .select({ groupId: groupMemberships.groupId })
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.memberId, memberId),
        isNull(groupMemberships.leftOn),
        inArray(groupMemberships.role, ["leader", "coleader"]),
      ),
    );
  return rows.map((r) => r.groupId);
}

/** R9.1. A type's own words, shown at the top of its section in the finder. */
/**
 * R9.1. Changing a kind of group: what it is called, what it is for, and the
 * colour it wears everywhere.
 *
 * The name is unique within the church, because two kinds called "Class" make
 * every list ambiguous and no filter can tell them apart.
 */
export async function updateGroupType(
  db: Tx,
  actor: WriteActor,
  id: string,
  input: { name: string; hue?: string; description?: string | null },
): Promise<void> {
  if (!canManageGroups(actor.role)) throw new PermissionError(actor.role, "manageGroups");

  const name = clean(input.name);
  if (!name) throw new InvalidInputError("groupType.error.name");

  const [taken] = await db
    .select({ id: groupTypes.id })
    .from(groupTypes)
    .where(sql`lower(${groupTypes.name}) = lower(${name})`)
    .limit(1);
  if (taken && taken.id !== id) {
    throw new NameTakenError("groupType.error.taken", name, taken.id);
  }

  const changed = await db
    .update(groupTypes)
    .set({
      name,
      // R9.1. Left as it is where the screen did not ask for one.
      ...(input.hue ? { hue: input.hue } : {}),
      description: input.description?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(groupTypes.id, id))
    .returning({ id: groupTypes.id });
  if (changed.length === 0) throw new InvalidInputError("groupType.error.missing");
}

/**
 * R9.1. Taking a kind off the list, and putting it back.
 *
 * Archived rather than deleted: the groups already filed under it keep their
 * kind, and a church that retires "Committee" and brings it back next year
 * finds its colour and its groups where they were.
 */
export async function setGroupTypeArchived(
  db: Tx,
  actor: WriteActor,
  id: string,
  archived: boolean,
): Promise<void> {
  if (!canManageGroups(actor.role)) throw new PermissionError(actor.role, "manageGroups");

  const changed = await db
    .update(groupTypes)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(groupTypes.id, id))
    .returning({ id: groupTypes.id });
  if (changed.length === 0) throw new InvalidInputError("groupType.error.missing");
}

/** R9.1. The order they appear in, written as one list. */
export async function reorderGroupTypes(
  db: Tx,
  actor: WriteActor,
  ids: string[],
): Promise<void> {
  if (!canManageGroups(actor.role)) throw new PermissionError(actor.role, "manageGroups");

  for (const [position, id] of ids.entries()) {
    await db
      .update(groupTypes)
      .set({ position, updatedAt: new Date() })
      .where(eq(groupTypes.id, id));
  }
}

/** R9.1. How many live groups are filed under each kind. */
export async function groupTypeCounts(db: Tx): Promise<Record<string, number>> {
  const rows = await db
    .select({ typeId: groups.typeId, n: sql<number>`count(*)::int` })
    .from(groups)
    .where(isNull(groups.archivedAt))
    .groupBy(groups.typeId);

  return Object.fromEntries(
    rows.filter((row) => row.typeId).map((row) => [row.typeId as string, Number(row.n)]),
  );
}

export async function describeGroupType(
  db: Tx,
  actor: WriteActor,
  id: string,
  description: string | null,
): Promise<void> {
  if (!canManageGroups(actor.role)) throw new PermissionError(actor.role, "manageGroups");
  await db
    .update(groupTypes)
    .set({ description: description?.trim() || null, updatedAt: new Date() })
    .where(eq(groupTypes.id, id));
}

/**
 * R9.2, R1.16. Puts a picture on a group, and takes the old one off.
 *
 * The same shape as the church logo: replacing a photo ten times costs one
 * photo rather than ten, because the ledger row for the old key goes with it
 * and the caller removes the object. A quota a church pays for in files nothing
 * points at is a quota it cannot understand.
 */
export async function setGroupPhoto(
  db: Tx,
  actor: WriteActor,
  groupId: string,
  key: string | null,
): Promise<{ removed: string | null }> {
  if (!canManageGroups(actor.role)) throw new PermissionError(actor.role, "manageGroups");

  const [before] = await db
    .select({ photoKey: groups.photoKey })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!before) throw new InvalidInputError("group.error.missing");

  await db
    .update(groups)
    .set({ photoKey: key, updatedAt: new Date() })
    .where(eq(groups.id, groupId));

  const old = before.photoKey;
  if (old && old !== key) {
    await db.delete(storedFiles).where(eq(storedFiles.key, old));
    return { removed: old };
  }
  return { removed: null };
}

/** R24.6. How many groups are running, for the count in the navigation. */
export async function countGroups(db: Tx): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(groups)
    .where(sql`${groups.archivedAt} is null`);
  return row?.n ?? 0;
}

/**
 * R9.5. Publishes a group, or takes it back to a draft.
 *
 * Taking it back hides it from the finder and from its own public page. The
 * roster, the attendance and everything else the church holds stay exactly
 * where they were.
 */
export async function setGroupStatus(
  db: Tx,
  actor: WriteActor,
  id: string,
  status: GroupStatus,
): Promise<void> {
  if (!canManageGroups(actor.role)) throw new PermissionError(actor.role, "manageGroups");

  const changed = await db
    .update(groups)
    .set({ status, updatedAt: new Date() })
    .where(eq(groups.id, id))
    .returning({ id: groups.id });
  if (changed.length === 0) throw new InvalidInputError("group.error.missing");
}
