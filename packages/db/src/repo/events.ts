import { and, asc, eq, ne, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { events, eventRegistrations } from "../schema/events";
import { forms } from "../schema/forms";
import { people } from "../schema/people";
import { PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import { can, rolesWith, type Who } from "../permissions";
import type { TenantRole } from "../roles";
import type { WriteActor } from "./people";
import { formSlug } from "./form-rules";

/**
 * R14.1 to R14.12. What the church is putting on.
 *
 * A camp, a picnic, a membership class. An event is a date somebody signs up
 * for, which is what separates it from a service occurrence (the week's rhythm)
 * and from a group (people who meet on a pattern).
 *
 * The questions asked at registration are an ordinary form, so everything the
 * builder already does, conditions and person matching included, is here with
 * nothing written twice.
 */

export const CAN_MANAGE_EVENTS: readonly TenantRole[] = rolesWith("events.manage");
export const canManageEvents = (role: Who): boolean => can(role, "events.manage");

export type EventStatus = "draft" | "published" | "cancelled";
export const EVENT_STATUSES: readonly EventStatus[] = ["draft", "published", "cancelled"];

export const EVENT_HUES = [
  "rose", "coral", "amber", "citron", "fern", "jade",
  "teal", "sky", "indigo", "violet", "orchid", "clay",
] as const;
export type EventHue = (typeof EVENT_HUES)[number];

export interface ChurchEvent {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  hue: string;
  coverKey: string | null;
  startsOn: string;
  startsAt: string | null;
  endsOn: string | null;
  endsAt: string | null;
  location: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  status: EventStatus;
  listed: boolean;
  takesRegistrations: boolean;
  registrationOpen: boolean;
  registrationClosesOn: string | null;
  registrationClosesAt: string | null;
  capacity: number | null;
  waitlist: boolean;
  formId: string | null;
  campusId: string | null;
  contactPersonId: string | null;
  contactName: string | null;
  archivedAt: string | null;
  /** R14.4. How many have a place, and how many are waiting for one. */
  going: number;
  waiting: number;
}

export interface EventInput {
  name: string;
  description?: string | null;
  hue?: string | null;
  startsOn: string;
  startsAt?: string | null;
  endsOn?: string | null;
  endsAt?: string | null;
  location?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  listed?: boolean;
  takesRegistrations?: boolean;
  registrationOpen?: boolean;
  registrationClosesOn?: string | null;
  registrationClosesAt?: string | null;
  capacity?: number | null;
  waitlist?: boolean;
  campusId?: string | null;
  contactPersonId?: string | null;
  /** R14.5. The form answered at registration, chosen when registration is turned on. */
  formId?: string | null;
}

const NAME_LIMIT = 160;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

const trimmed = (value: string | null | undefined): string | null =>
  value?.trim() || null;

function date(value: string | null | undefined, key: string): string | null {
  const cleaned = trimmed(value);
  if (!cleaned) return null;
  if (!ISO_DATE.test(cleaned) || Number.isNaN(Date.parse(cleaned))) {
    throw new InvalidInputError(key as never);
  }
  return cleaned;
}

function clock(value: string | null | undefined): string | null {
  const cleaned = trimmed(value);
  if (!cleaned) return null;
  // Seconds arrive from some pickers and mean nothing here.
  const short = cleaned.slice(0, 5);
  if (!CLOCK.test(short)) throw new InvalidInputError("event.error.time");
  return short;
}

function check(input: EventInput) {
  const name = input.name?.trim().replace(/\s+/g, " ");
  if (!name) throw new InvalidInputError("event.error.name");

  const startsOn = date(input.startsOn, "event.error.date");
  if (!startsOn) throw new InvalidInputError("event.error.date");

  const endsOn = date(input.endsOn, "event.error.date");
  // An event that ends before it starts is a typo, and silently swapping the
  // two would hide it.
  if (endsOn && endsOn < startsOn) throw new InvalidInputError("event.error.order");

  const closes = date(input.registrationClosesOn, "event.error.date");
  if (closes && closes > (endsOn ?? startsOn)) {
    throw new InvalidInputError("event.error.closesAfter");
  }

  const capacity = input.capacity ?? null;
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 100_000)) {
    throw new InvalidInputError("event.error.capacity");
  }

  const hue = trimmed(input.hue);
  if (hue && !EVENT_HUES.includes(hue as EventHue)) {
    throw new InvalidInputError("event.error.hue");
  }

  return {
    name: name.slice(0, NAME_LIMIT),
    description: trimmed(input.description),
    startsOn,
    startsAt: clock(input.startsAt),
    endsOn,
    endsAt: clock(input.endsAt),
    location: trimmed(input.location),
    addressLine1: trimmed(input.addressLine1),
    addressLine2: trimmed(input.addressLine2),
    city: trimmed(input.city),
    region: trimmed(input.region),
    postalCode: trimmed(input.postalCode),
    country: trimmed(input.country),
    listed: input.listed ?? true,
    takesRegistrations: input.takesRegistrations ?? true,
    // An event nobody signs up for is never taking registrations, whatever the
    // switch underneath it last said.
    registrationOpen: (input.takesRegistrations ?? true) && (input.registrationOpen ?? true),
    registrationClosesOn: closes,
    registrationClosesAt: clock(input.registrationClosesAt),
    capacity,
    waitlist: input.waitlist ?? true,
    campusId: trimmed(input.campusId),
    contactPersonId: trimmed(input.contactPersonId),
    // An event nobody signs up for asks nothing, so it holds no form either.
    formId: (input.takesRegistrations ?? true) ? trimmed(input.formId) : null,
    ...(hue ? { hue: hue as EventHue } : {}),
  };
}

/** The public part of the link, unique within the church. */
async function freeSlug(db: Tx, name: string, exclude?: string): Promise<string> {
  const base = formSlug(name);
  for (let n = 1; n < 200; n += 1) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const [clash] = await db
      .select({ id: events.id })
      .from(events)
      .where(exclude
        ? and(eq(events.slug, candidate), ne(events.id, exclude))
        : eq(events.slug, candidate))
      .limit(1);
    if (!clash) return candidate;
  }
  throw new InvalidInputError("event.error.name");
}

const countFor = (state: string) => sql<number>`(
  select count(*) from ${eventRegistrations}
   where ${eventRegistrations.eventId} = ${events.id}
     and ${eventRegistrations.state} = ${state}
)::int`;

const columns = {
  id: events.id,
  name: events.name,
  slug: events.slug,
  description: events.description,
  hue: events.hue,
  coverKey: events.coverKey,
  startsOn: events.startsOn,
  startsAt: events.startsAt,
  endsOn: events.endsOn,
  endsAt: events.endsAt,
  location: events.location,
  addressLine1: events.addressLine1,
  addressLine2: events.addressLine2,
  city: events.city,
  region: events.region,
  postalCode: events.postalCode,
  country: events.country,
  status: events.status,
  listed: events.listed,
  takesRegistrations: events.takesRegistrations,
  registrationOpen: events.registrationOpen,
  registrationClosesOn: events.registrationClosesOn,
  registrationClosesAt: events.registrationClosesAt,
  capacity: events.capacity,
  waitlist: events.waitlist,
  formId: events.formId,
  campusId: events.campusId,
  contactPersonId: events.contactPersonId,
  archivedAt: events.archivedAt,
  contactFirst: people.firstName,
  contactPreferred: people.preferredName,
  contactLast: people.lastName,
  going: countFor("going"),
  waiting: countFor("waiting"),
};

const shape = (row: Record<string, unknown>): ChurchEvent => ({
  id: row["id"] as string,
  name: row["name"] as string,
  slug: row["slug"] as string,
  description: (row["description"] ?? null) as string | null,
  hue: row["hue"] as string,
  coverKey: (row["coverKey"] ?? null) as string | null,
  startsOn: row["startsOn"] as string,
  startsAt: (row["startsAt"] ?? null) as string | null,
  endsOn: (row["endsOn"] ?? null) as string | null,
  endsAt: (row["endsAt"] ?? null) as string | null,
  location: (row["location"] ?? null) as string | null,
  addressLine1: (row["addressLine1"] ?? null) as string | null,
  addressLine2: (row["addressLine2"] ?? null) as string | null,
  city: (row["city"] ?? null) as string | null,
  region: (row["region"] ?? null) as string | null,
  postalCode: (row["postalCode"] ?? null) as string | null,
  country: (row["country"] ?? null) as string | null,
  status: row["status"] as EventStatus,
  listed: row["listed"] as boolean,
  takesRegistrations: row["takesRegistrations"] as boolean,
  registrationOpen: row["registrationOpen"] as boolean,
  registrationClosesOn: (row["registrationClosesOn"] ?? null) as string | null,
  registrationClosesAt: (row["registrationClosesAt"] ?? null) as string | null,
  capacity: (row["capacity"] ?? null) as number | null,
  waitlist: row["waitlist"] as boolean,
  formId: (row["formId"] ?? null) as string | null,
  campusId: (row["campusId"] ?? null) as string | null,
  contactPersonId: (row["contactPersonId"] ?? null) as string | null,
  contactName: row["contactFirst"]
    ? `${(row["contactPreferred"] ?? row["contactFirst"]) as string} ${row["contactLast"] as string}`.trim()
    : null,
  archivedAt: (row["archivedAt"] as Date | null)?.toISOString() ?? null,
  going: row["going"] as number,
  waiting: row["waiting"] as number,
});

/**
 * R14.1. The church's events, soonest first.
 *
 * Everything still to come leads, because that is what somebody opening this
 * screen came for. What has been and gone sits under it in reverse, which is
 * the order a church reads history in.
 */
export async function listEvents(
  db: Tx,
  opts: { includeArchived?: boolean; archivedOnly?: boolean } = {},
): Promise<ChurchEvent[]> {
  const rows = await db
    .select(columns)
    .from(events)
    .leftJoin(people, eq(people.id, events.contactPersonId))
    .where(
      opts.archivedOnly
        ? sql`${events.archivedAt} is not null`
        : opts.includeArchived
          ? undefined
          : sql`${events.archivedAt} is null`,
    )
    .orderBy(asc(events.startsOn), asc(events.startsAt), asc(events.name));

  return rows.map((row) => shape(row as Record<string, unknown>));
}

export async function getEvent(db: Tx, id: string): Promise<ChurchEvent | null> {
  const [row] = await db
    .select(columns)
    .from(events)
    .leftJoin(people, eq(people.id, events.contactPersonId))
    .where(eq(events.id, id))
    .limit(1);
  return row ? shape(row as Record<string, unknown>) : null;
}

export async function createEvent(
  db: Tx,
  actor: WriteActor,
  input: EventInput,
): Promise<{ id: string }> {
  if (!canManageEvents(actor.role)) throw new PermissionError(actor.role, "manageEvents");
  const values = check(input);

  const [row] = await db
    .insert(events)
    .values({
      tenantId: actor.tenantId,
      ...values,
      slug: await freeSlug(db, values.name),
    })
    .returning({ id: events.id });
  return { id: row!.id };
}

export async function updateEvent(
  db: Tx,
  actor: WriteActor,
  id: string,
  input: EventInput,
): Promise<void> {
  if (!canManageEvents(actor.role)) throw new PermissionError(actor.role, "manageEvents");
  const values = check(input);

  const changed = await db
    .update(events)
    .set({ ...values, slug: await freeSlug(db, values.name, id), updatedAt: new Date() })
    .where(eq(events.id, id))
    .returning({ id: events.id });
  if (changed.length === 0) throw new InvalidInputError("event.error.missing");
}

/**
 * R14.1. Publishes an event, or takes it back, or calls it off.
 *
 * A cancelled event keeps its public page and says it is cancelled, because the
 * people who registered will go looking for it and a dead link tells them
 * nothing.
 */
export async function setEventStatus(
  db: Tx,
  actor: WriteActor,
  id: string,
  status: EventStatus,
): Promise<void> {
  if (!canManageEvents(actor.role)) throw new PermissionError(actor.role, "manageEvents");
  if (!EVENT_STATUSES.includes(status)) throw new InvalidInputError("event.error.status");

  const changed = await db
    .update(events)
    .set({
      status,
      // A cancelled event stops taking names. Publishing again does not reopen
      // registration on its own: that is the church's decision, not a side
      // effect of pressing publish.
      ...(status === "cancelled" ? { registrationOpen: false } : {}),
      updatedAt: new Date(),
    })
    .where(eq(events.id, id))
    .returning({ id: events.id });
  if (changed.length === 0) throw new InvalidInputError("event.error.missing");
}

/** R14.4. Opens registration, or closes it, without touching anything else. */
export async function setEventRegistrationOpen(
  db: Tx,
  actor: WriteActor,
  id: string,
  open: boolean,
): Promise<void> {
  if (!canManageEvents(actor.role)) throw new PermissionError(actor.role, "manageEvents");

  const changed = await db
    .update(events)
    .set({ registrationOpen: open, updatedAt: new Date() })
    .where(eq(events.id, id))
    .returning({ id: events.id });
  if (changed.length === 0) throw new InvalidInputError("event.error.missing");
}

export async function setEventHue(
  db: Tx,
  actor: WriteActor,
  id: string,
  value: string,
): Promise<void> {
  if (!canManageEvents(actor.role)) throw new PermissionError(actor.role, "manageEvents");
  if (!EVENT_HUES.includes(value as EventHue)) throw new InvalidInputError("event.error.hue");

  await db
    .update(events)
    .set({ hue: value as EventHue, updatedAt: new Date() })
    .where(eq(events.id, id));
}

/** R14.1. The picture across the top. Returns the key no longer wanted. */
export async function setEventCover(
  db: Tx,
  actor: WriteActor,
  id: string,
  key: string | null,
): Promise<{ removed: string | null }> {
  if (!canManageEvents(actor.role)) throw new PermissionError(actor.role, "manageEvents");

  const [row] = await db
    .select({ coverKey: events.coverKey })
    .from(events)
    .where(eq(events.id, id))
    .limit(1);
  if (!row) throw new InvalidInputError("event.error.missing");

  await db.update(events).set({ coverKey: key, updatedAt: new Date() }).where(eq(events.id, id));
  return { removed: row.coverKey && row.coverKey !== key ? row.coverKey : null };
}

/**
 * R14.1. Puts an event away.
 *
 * Archived rather than deleted, because the roster under it is a record of who
 * was there.
 */
export async function setEventArchived(
  db: Tx,
  actor: WriteActor,
  id: string,
  archived: boolean,
): Promise<void> {
  if (!canManageEvents(actor.role)) throw new PermissionError(actor.role, "manageEvents");

  const changed = await db
    .update(events)
    .set({
      archivedAt: archived ? new Date() : null,
      ...(archived ? { registrationOpen: false } : {}),
      updatedAt: new Date(),
    })
    .where(eq(events.id, id))
    .returning({ id: events.id });
  if (changed.length === 0) throw new InvalidInputError("event.error.missing");
}

/** R14.1. How many have been put away, for the link that goes to them. */
export async function countArchivedEvents(db: Tx): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(events)
    .where(sql`${events.archivedAt} is not null`);
  return row?.count ?? 0;
}

/**
 * R14.5. The form holding this event's registration questions.
 *
 * Made on demand, because most events ask nothing beyond a name. The form is
 * marked with the event, which is what keeps it out of the Forms list.
 */
export async function ensureEventForm(
  db: Tx,
  actor: WriteActor,
  eventId: string,
): Promise<{ id: string }> {
  if (!canManageEvents(actor.role)) throw new PermissionError(actor.role, "manageEvents");

  const found = await getEvent(db, eventId);
  if (!found) throw new InvalidInputError("event.error.missing");
  if (found.formId) return { id: found.formId };

  const [row] = await db
    .insert(forms)
    .values({
      tenantId: actor.tenantId,
      name: found.name,
      slug: `event-${found.slug}`,
      status: "open",
      eventId,
    })
    .returning({ id: forms.id });

  await db
    .update(events)
    .set({ formId: row!.id, updatedAt: new Date() })
    .where(eq(events.id, eventId));
  return { id: row!.id };
}

/**
 * R14.5. Points an event at a form the church has already written.
 *
 * Linked rather than claimed: the form keeps its own public link and stays in
 * the Forms list, because a church that built one connection card for the whole
 * term should be able to use it on an event without losing it everywhere else.
 * `ensureEventForm` is the other half, for questions that belong to one event.
 *
 * Null unlinks, which leaves the form where it is and the event asking only for
 * a name.
 */
export async function setEventForm(
  db: Tx,
  actor: WriteActor,
  eventId: string,
  formId: string | null,
): Promise<void> {
  if (!canManageEvents(actor.role)) throw new PermissionError(actor.role, "manageEvents");

  if (formId) {
    const [found] = await db
      .select({ id: forms.id })
      .from(forms)
      .where(and(eq(forms.id, formId), sql`${forms.archivedAt} is null`))
      .limit(1);
    if (!found) throw new InvalidInputError("form.error.missing");
  }

  const changed = await db
    .update(events)
    .set({ formId, updatedAt: new Date() })
    .where(eq(events.id, eventId))
    .returning({ id: events.id });
  if (changed.length === 0) throw new InvalidInputError("event.error.missing");
}
