import { eq, inArray, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { demoRecords, serviceTimes } from "../schema/tenancy";
import { serviceOccurrences } from "../schema/gatherings";
import { checkinRooms, checkinStations } from "../schema/checkin";
import { people, households, tags } from "../schema/people";
import { createPerson, type WriteActor } from "../repo/people";
import { createTag, setPersonTag } from "../repo/tags";
import { addMilestone, type MilestoneKind } from "../repo/milestones";
import { addRelationship, type RelationshipKind } from "../repo/relationships";
import { canManageChurch, addServiceTime } from "../repo/church";
import { generateOccurrences, listOccurrences, setHeadcount } from "../repo/services";
import { setPresentMany } from "../repo/attendance";
import { addRoom } from "../repo/rooms";
import { addStation } from "../repo/stations";
import { PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import { DEMO_PEOPLE, DEMO_TAGS } from "./people";

/**
 * R19.7. A demo church, loadable and removable.
 *
 * Time to value is the metric this serves. A church that signs up sees an empty
 * list and has no way to tell whether the product suits them without first
 * doing the work of importing. This fills it in one press and empties it in
 * another.
 *
 * Every id written is recorded, so removing is exact rather than a guess from
 * names or dates. Removal is a real delete, which is the one place the
 * archive rule does not apply: these are not the church's records, and a demo
 * you cannot get rid of is worse than no demo.
 */

export interface DemoState {
  loaded: boolean;
  people: number;
}

export async function demoState(db: Tx): Promise<DemoState> {
  const [row] = await db
    .select({ n: sql<string>`count(*) filter (where ${demoRecords.entity} = 'person')` })
    .from(demoRecords);
  const count = Number(row?.n ?? 0);
  return { loaded: count > 0, people: count };
}

export async function loadDemoData(db: Tx, actor: WriteActor): Promise<DemoState> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "manageDemoData");

  if ((await demoState(db)).loaded) throw new InvalidInputError("demo.error.alreadyLoaded");

  const remember = async (entity: string, recordId: string) => {
    await db.insert(demoRecords).values({ tenantId: actor.tenantId, entity, recordId });
  };

  const tagIds = new Map<string, string>();
  for (const tag of DEMO_TAGS) {
    const created = await createTag(db, actor, { name: tag.name, hue: tag.hue as never });
    tagIds.set(tag.name, created.id);
    await remember("tag", created.id);
  }

  // Households are created by name on the first person who lives in one, so the
  // second person in a household has to be given the id rather than the name.
  const householdIds = new Map<string, string>();
  const personIds = new Map<string, string>();

  for (const person of DEMO_PEOPLE) {
    const existing = person.household ? householdIds.get(person.household) : undefined;

    const created = await createPerson(db, actor, {
      firstName: person.firstName,
      lastName: person.lastName,
      preferredName: person.preferredName ?? null,
      dateOfBirth: person.dateOfBirth ?? null,
      lifecycleStatus: person.status,
      membershipDate: person.membershipDate ?? null,
      firstVisitOn: person.firstVisitOn ?? null,
      email: person.email ?? null,
      phone: person.phone ?? null,
      householdId: existing ?? null,
      householdName: existing ? null : (person.household ?? null),
      householdRole: person.householdRole ?? "other",
    });

    personIds.set(`${person.firstName} ${person.lastName}`, created.id);
    await remember("person", created.id);

    if (person.household && !existing) {
      const [row] = await db
        .select({ id: households.id })
        .from(households)
        .where(eq(households.name, person.household))
        .limit(1);
      if (row) {
        householdIds.set(person.household, row.id);
        await remember("household", row.id);
      }
    }

    for (const name of person.tags ?? []) {
      const tagId = tagIds.get(name);
      if (tagId) await setPersonTag(db, actor, created.id, tagId, true);
    }

    for (const milestone of person.milestones ?? []) {
      await addMilestone(db, actor, {
        personId: created.id,
        kind: milestone.kind as MilestoneKind,
        occurredOn: milestone.on,
      });
    }
  }

  // Relationships last, because both people have to exist first.
  for (const person of DEMO_PEOPLE) {
    const id = personIds.get(`${person.firstName} ${person.lastName}`);
    if (!id) continue;
    for (const relation of person.relationships ?? []) {
      const other = personIds.get(relation.to);
      if (!other) continue;
      try {
        await addRelationship(db, actor, {
          personId: id,
          relatedPersonId: other,
          kind: relation.kind as RelationshipKind,
        });
      } catch (error) {
        // The inverse of a relationship already written is a duplicate, which
        // is the right answer rather than a failure.
        if (!(error instanceof InvalidInputError)) throw error;
      }
    }
  }

  await loadSundays(db, actor, remember, [...personIds.values()]);

  return demoState(db);
}

/** A weekday, as an ISO date, counting back from today. */
const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

/**
 * The rest of what an owner sees: a calendar, attendance against it, the rooms
 * children are checked into, and a station.
 *
 * A demo that is a directory beside four empty screens shows a church nothing
 * about whether the product suits them. Everything here is written through the
 * same functions the product uses, so a demo cannot drift into showing
 * something the church would not get.
 */
async function loadSundays(
  db: Tx,
  actor: WriteActor,
  remember: (entity: string, recordId: string) => Promise<void>,
  people: string[],
): Promise<void> {
  const pattern = [
    { name: "First service", dayOfWeek: 0, startsAt: "09:00" },
    { name: "Second service", dayOfWeek: 0, startsAt: "11:00" },
    { name: "Midweek", dayOfWeek: 3, startsAt: "19:00" },
  ];
  for (const time of pattern) {
    const created = await addServiceTime(db, actor, time);
    await remember("serviceTime", created.id);
  }

  // Ten weeks back and four forward, so the page opens on a month with both a
  // history to read and something still to come.
  await generateOccurrences(db, actor, { from: daysAgo(70), to: daysAgo(-28) });

  const held = (await listOccurrences(db, { from: daysAgo(70), to: daysAgo(1) }))
    .sort((a, b) => a.occursOn.localeCompare(b.occursOn));

  for (const [index, occurrence] of held.entries()) {
    const midweek = occurrence.startsAt >= "18:00";
    // A visitor is waiting while this runs, and every service written is
    // another round trip. Four weeks of records is enough to read.
    if (occurrence.occursOn < daysAgo(28)) continue;

    // Names on Sundays, a headcount midweek, which is how a church this size
    // actually records the two.
    if (!midweek) {
      // A different two thirds each week, rather than the same list every
      // Sunday.
      const present = people.filter((_, i) => (i + index) % 3 !== 0);
      if (present.length) await setPresentMany(db, actor, occurrence.id, present, true);
    }

    if (midweek) {
      await setHeadcount(db, actor, occurrence.id, {
        adults: 40 + (index % 7) * 3,
        children: 12 + (index % 4),
        visitors: index % 3,
        note: null,
      });
    }
  }

  const rooms = [
    { name: "Nursery", hue: "amber", minAgeMonths: 0, maxAgeMonths: 24, capacity: 12, ratio: 4 },
    { name: "Toddlers", hue: "fern", minAgeMonths: 24, maxAgeMonths: 48, capacity: 16, ratio: 5 },
    { name: "Kids", hue: "sky", minAgeMonths: 48, maxAgeMonths: 144, capacity: 30, ratio: 8 },
    { name: "Youth", hue: "violet", minAgeMonths: 144, maxAgeMonths: 216, capacity: 25, ratio: 10 },
  ];
  const roomIds: string[] = [];
  for (const room of rooms) {
    const created = await addRoom(db, actor, room);
    roomIds.push(created.id);
    await remember("room", created.id);
  }

  const station = await addStation(db, actor, {
    name: "Foyer desk", mode: "desk", printer: "paper", roomIds: [], serviceTimeIds: [],
  });
  await remember("station", station.id);
}

export interface DemoRemoval {
  people: number;
  households: number;
  tags: number;
}

/**
 * Takes the demo church away.
 *
 * Records added since are left alone, because only the ids this wrote are
 * removed. A person the church added to a demo household keeps their record;
 * the household goes and they are left without one, which is visible and
 * fixable, rather than the person disappearing with it.
 */
export async function removeDemoData(db: Tx, actor: WriteActor): Promise<DemoRemoval> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "manageDemoData");

  const rows = await db
    .select({ entity: demoRecords.entity, recordId: demoRecords.recordId })
    .from(demoRecords);

  const ids = (entity: string) =>
    rows.filter((r) => r.entity === entity).map((r) => r.recordId);

  const personIds = ids("person");
  const householdIds = ids("household");
  const tagIds = ids("tag");
  const serviceTimeIds = ids("serviceTime");
  const roomIds = ids("room");
  const stationIds = ids("station");

  // People first. Their contacts, tags, milestones, relationships and notes go
  // with them through the foreign keys.
  const gonePeople = personIds.length
    ? await db.delete(people).where(inArray(people.id, personIds)).returning({ id: people.id })
    : [];
  const goneTags = tagIds.length
    ? await db.delete(tags).where(inArray(tags.id, tagIds)).returning({ id: tags.id })
    : [];
  const goneHouseholds = householdIds.length
    ? await db.delete(households).where(inArray(households.id, householdIds)).returning({ id: households.id })
    : [];

  // The calendar and the rooms. Occurrences and attendance go with the service
  // time through the foreign keys, and so do a station's rooms and services.
  if (stationIds.length) {
    await db.delete(checkinStations).where(inArray(checkinStations.id, stationIds));
  }
  if (roomIds.length) {
    await db.delete(checkinRooms).where(inArray(checkinRooms.id, roomIds));
  }
  if (serviceTimeIds.length) {
    await db.delete(serviceOccurrences).where(inArray(serviceOccurrences.serviceTimeId, serviceTimeIds));
    await db.delete(serviceTimes).where(inArray(serviceTimes.id, serviceTimeIds));
  }

  await db.delete(demoRecords);

  return {
    people: gonePeople.length,
    households: goneHouseholds.length,
    tags: goneTags.length,
  };
}
