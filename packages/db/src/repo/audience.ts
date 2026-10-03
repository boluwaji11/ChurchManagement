import { and, asc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { people, personTags, tags, contactMethods } from "../schema/people";
import { groups, groupMemberships } from "../schema/groups";
import { teams, teamMembers } from "../schema/serving";
import { pipelines, pipelineEntries } from "../schema/followups";
import { savedLists } from "../schema/lists";
import { InvalidInputError } from "../errors";
import { listPeople } from "./people";
import { resolveList } from "./lists";
import {
  AUDIENCE_KINDS, type AudienceChoice, type MergeValues,
} from "./merge-rules";

/**
 * R16.5. Who a message goes to.
 *
 * A church already keeps its groups of people in the places it works in every
 * day: saved lists, groups, teams, pipelines and tags. So targeting reads those
 * rather than asking somebody to build a query, which is the thing that makes
 * the bigger products unusable for a volunteer.
 *
 * Giving status is held back to 0.3 with the rest of the money.
 */

export interface Recipient {
  personId: string;
  name: string;
  email: string;
  values: MergeValues;
}

export interface AudienceResult {
  recipients: Recipient[];
  /** People in the audience with no email address on their record. */
  noEmail: number;
  /** Everybody the audience matched, reachable or not. */
  total: number;
}

export interface AudienceOption {
  id: string;
  name: string;
  /** How many live people it holds, so a leader can see it is the right one. */
  count: number;
}

export interface AudienceOptions {
  lists: AudienceOption[];
  groups: AudienceOption[];
  teams: AudienceOption[];
  pipelines: AudienceOption[];
  tags: AudienceOption[];
}

/** R16.5. Nobody archived, and nobody recorded as dead. */
const alive = () => and(isNull(people.archivedAt), ne(people.lifecycleStatus, "deceased"));

/** R16.5. What a church can pick from, each with how many it holds. */
export async function audienceOptions(db: Tx): Promise<AudienceOptions> {
  const [listRows, groupRows, teamRows, pipelineRows, tagRows] = await Promise.all([
    db
      .select({ id: savedLists.id, name: savedLists.name })
      .from(savedLists)
      .where(isNull(savedLists.archivedAt))
      .orderBy(asc(savedLists.name)),

    db
      .select({
        id: groups.id,
        name: groups.name,
        count: sql<number>`count(${groupMemberships.id})::int`,
      })
      .from(groups)
      .leftJoin(groupMemberships, and(
        eq(groupMemberships.groupId, groups.id),
        isNull(groupMemberships.leftOn),
      ))
      .where(isNull(groups.archivedAt))
      .groupBy(groups.id, groups.name)
      .orderBy(asc(groups.name)),

    db
      .select({
        id: teams.id,
        name: teams.name,
        count: sql<number>`count(${teamMembers.id})::int`,
      })
      .from(teams)
      .leftJoin(teamMembers, and(
        eq(teamMembers.teamId, teams.id),
        isNull(teamMembers.leftOn),
      ))
      .where(isNull(teams.archivedAt))
      .groupBy(teams.id, teams.name)
      .orderBy(asc(teams.name)),

    db
      .select({
        id: pipelines.id,
        name: pipelines.name,
        count: sql<number>`count(${pipelineEntries.id}) filter (where ${pipelineEntries.status} = 'open')::int`,
      })
      .from(pipelines)
      .leftJoin(pipelineEntries, eq(pipelineEntries.pipelineId, pipelines.id))
      .groupBy(pipelines.id, pipelines.name)
      .orderBy(asc(pipelines.name)),

    db
      .select({
        id: tags.id,
        name: tags.name,
        count: sql<number>`count(${personTags.personId})::int`,
      })
      .from(tags)
      .leftJoin(personTags, eq(personTags.tagId, tags.id))
      .groupBy(tags.id, tags.name)
      .orderBy(asc(tags.name)),
  ]);

  // A saved list may be rule-based, so its size is the resolved size.
  const lists: AudienceOption[] = [];
  for (const list of listRows) {
    const ids = await idsForList(db, list.id);
    lists.push({ id: list.id, name: list.name, count: ids.length });
  }

  return { lists, groups: groupRows, teams: teamRows, pipelines: pipelineRows, tags: tagRows };
}

async function idsForList(db: Tx, id: string): Promise<string[]> {
  const list = await resolveList(db, id);
  if (!list) throw new InvalidInputError("audience.error.missing");

  if (list.kind === "static") return list.ids ?? [];

  // A rule list is the directory query it was saved as.
  const rows = await listPeople(db, (list.rule ?? {}) as never);
  return rows.map((row) => row.id);
}

/** R16.5. Everybody the choice matches, before anything is said about reaching them. */
export async function resolveAudience(db: Tx, choice: AudienceChoice): Promise<string[]> {
  if (!AUDIENCE_KINDS.includes(choice.kind)) {
    throw new InvalidInputError("audience.error.kind");
  }
  if (choice.kind !== "everybody" && !choice.id) {
    throw new InvalidInputError("audience.error.which");
  }

  if (choice.kind === "list") return idsForList(db, choice.id!);

  const rows = await (async () => {
    switch (choice.kind) {
      case "everybody":
        return db.select({ id: people.id }).from(people).where(alive());

      case "group":
        return db
          .select({ id: people.id })
          .from(people)
          .innerJoin(groupMemberships, and(
            eq(groupMemberships.personId, people.id),
            eq(groupMemberships.groupId, choice.id!),
            isNull(groupMemberships.leftOn),
          ))
          .where(alive());

      case "team":
        return db
          .select({ id: people.id })
          .from(people)
          .innerJoin(teamMembers, and(
            eq(teamMembers.personId, people.id),
            eq(teamMembers.teamId, choice.id!),
            isNull(teamMembers.leftOn),
          ))
          .where(alive());

      case "pipeline":
        return db
          .select({ id: people.id })
          .from(people)
          .innerJoin(pipelineEntries, and(
            eq(pipelineEntries.personId, people.id),
            eq(pipelineEntries.pipelineId, choice.id!),
            eq(pipelineEntries.status, "open"),
          ))
          .where(alive());

      case "tag":
        return db
          .select({ id: people.id })
          .from(people)
          .innerJoin(personTags, and(
            eq(personTags.personId, people.id),
            eq(personTags.tagId, choice.id!),
          ))
          .where(alive());

      case "status":
        return db
          .select({ id: people.id })
          .from(people)
          .where(and(alive(), sql`${people.lifecycleStatus}::text = ${choice.id}`));

      default:
        throw new InvalidInputError("audience.error.kind");
    }
  })();

  return [...new Set(rows.map((row) => row.id))];
}

/**
 * R16.5. The audience, with an address against each name where there is one.
 *
 * Somebody with no email address is counted rather than quietly dropped. A
 * church sending to a group of forty and reaching thirty-one wants to know
 * which nine it missed, and the number is the start of that.
 */
export async function recipientsFor(
  db: Tx,
  choice: AudienceChoice,
  churchName: string,
): Promise<AudienceResult> {
  const ids = await resolveAudience(db, choice);
  if (ids.length === 0) return { recipients: [], noEmail: 0, total: 0 };

  const rows = await db
    .select({
      id: people.id,
      firstName: people.firstName,
      preferredName: people.preferredName,
      lastName: people.lastName,
      email: contactMethods.value,
    })
    .from(people)
    /*
     * Joined rather than fetched by a correlated subquery. Drizzle renders a
     * column reference inside a sql template unqualified, so `people.id` in a
     * subquery over contact_methods binds to that table's own id and matches
     * nothing. The join says what it means.
     */
    .leftJoin(contactMethods, and(
      eq(contactMethods.personId, people.id),
      eq(contactMethods.kind, "email"),
      eq(contactMethods.isPrimary, true),
      // R16.7. An address a mail server has already refused for good is not an
      // address, so somebody holding one counts as unreachable rather than
      // taking up a slot in every send from now on.
      eq(contactMethods.isValid, true),
    ))
    .where(and(inArray(people.id, ids), alive()))
    .orderBy(asc(people.lastName), asc(people.firstName));

  const recipients: Recipient[] = [];
  let noEmail = 0;

  for (const row of rows) {
    const first = row.preferredName ?? row.firstName;
    const name = `${first} ${row.lastName}`;
    const email = row.email?.trim().toLowerCase();

    if (!email) {
      noEmail += 1;
      continue;
    }

    recipients.push({
      personId: row.id,
      name,
      email,
      values: {
        first_name: first,
        last_name: row.lastName,
        full_name: name,
        email,
        church: churchName,
      },
    });
  }

  return { recipients, noEmail, total: rows.length };
}
