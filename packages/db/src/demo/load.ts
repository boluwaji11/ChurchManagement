import { eq, inArray, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { demoRecords } from "../schema/tenancy";
import { people, households, tags } from "../schema/people";
import { createPerson, type WriteActor } from "../repo/people";
import { createTag, setPersonTag } from "../repo/tags";
import { addMilestone, type MilestoneKind } from "../repo/milestones";
import { addRelationship, type RelationshipKind } from "../repo/relationships";
import { canManageChurch } from "../repo/church";
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

  return demoState(db);
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

  await db.delete(demoRecords);

  return {
    people: gonePeople.length,
    households: goneHouseholds.length,
    tags: goneTags.length,
  };
}
