import { eq, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { people } from "../schema/people";
import { personMerges } from "../schema/merges";
import { canArchivePeople, PermissionError, type TenantRole } from "../roles";
import { InvalidInputError } from "../errors";
import { getPersonForEdit, type PersonInput } from "./people";
import { buildMatchIndex, findMatches, type Confidence } from "../import/match";

/**
 * R2.8. Merging two records that are one person, and undoing it.
 *
 * The undo is not a nice extra. Merging the wrong two people is the fear that
 * stops anybody pressing the button, and a merge nobody dares press leaves the
 * duplicates in the directory, which is the problem this was for.
 */

export const MERGE_UNDO_WINDOW_DAYS = 30;

/**
 * Tables whose rows belong to a person and move with them.
 *
 * import_rows is deliberately absent. It records what an import did at the time,
 * and re-pointing it would make the history say something that did not happen.
 */
const OWNED: {
  table: string;
  column: string;
  conflictOn?: string[];
  /**
   * Extra SQL narrowing what counts as a collision, where the unique index is
   * partial. `w` is the winner's row and `t` the loser's. Without this, a
   * membership the winner once left would block the loser's live one from
   * moving, and the person would quietly come off the group.
   */
  liveOnly?: string;
  /** The column naming one row, where the table has no `id` of its own. */
  key?: string;
}[] = [
  { table: "contact_methods", column: "person_id" },
  { table: "addresses", column: "person_id" },
  { table: "household_memberships", column: "person_id" },
  { table: "milestones", column: "person_id" },
  { table: "background_checks", column: "person_id" },
  { table: "notes", column: "person_id" },
  // A tag the winner already carries would collide, so those rows stay put.
  { table: "person_tags", column: "person_id", conflictOn: ["tag_id"], key: "tag_id" },
  // Same for a custom field the winner has already answered.
  { table: "custom_field_values", column: "entity_id", conflictOn: ["field_id"] },
  // R2.9. A skill the winner already has would collide, so that row stays.
  { table: "person_abilities", column: "person_id", conflictOn: ["ability_id"], key: "ability_id" },
  // R1.14. A list the winner is already on would collide, so those rows stay.
  { table: "saved_list_members", column: "person_id", conflictOn: ["list_id"] },
  // R9.4. Group membership. Only a live row collides with a live row: the index
  // is partial, and the history of somebody who left and came back is two rows
  // on purpose.
  {
    table: "group_memberships",
    column: "person_id",
    conflictOn: ["group_id"],
    liveOnly: "w.left_on is null and t.left_on is null",
  },
  // R5.3. One open entry per person per pipeline, so only two open entries
  // collide. A closed one is history and moves.
  {
    table: "pipeline_entries",
    column: "person_id",
    conflictOn: ["pipeline_id"],
    liveOnly: "w.status = 'open' and t.status = 'open'",
  },
  // R5.1. A task about this person. Nothing is unique, so all of it moves.
  { table: "follow_ups", column: "person_id" },
  // R9.5. A request to join, which belongs to whoever is left standing.
  {
    table: "group_join_requests",
    column: "person_id",
    conflictOn: ["group_id"],
    liveOnly: "w.decided_at is null and t.decided_at is null",
  },
];

/**
 * The column naming one row, for the tables that have no `id` of their own.
 * Read on the way back out of a merge, where only the table name survives in
 * the record of what moved.
 */
const KEYS: Record<string, string> = Object.fromEntries(
  OWNED.filter((o) => o.key).map((o) => [o.table, o.key!]),
);

export interface MergePlan {
  winnerId: string;
  loserId: string;
  /** Field by field, which record's value survives. Absent means the winner's. */
  take?: Partial<Record<keyof PersonInput, "winner" | "loser">>;
}

export interface MergeResult {
  mergeId: string;
  movedRows: number;
}

/**
 * Merges the loser into the winner.
 *
 * The loser is archived, never deleted. Archiving is what makes undo possible at
 * all, and it is also the honest answer: the record existed, somebody created
 * it, and its id may be referenced by an import's history or an audit entry.
 */
export async function mergePeople(
  db: Tx,
  actor: { tenantId: string; role: TenantRole; userId?: string },
  plan: MergePlan,
): Promise<MergeResult> {
  // A merge can move every note and every giving record off one person and onto
  // another. That is archive-shaped work, not edit-shaped work.
  if (!canArchivePeople(actor.role)) throw new PermissionError(actor.role, "mergePeople");
  if (plan.winnerId === plan.loserId) throw new InvalidInputError("merge.error.samePerson");

  const winner = await getPersonForEdit(db, plan.winnerId);
  const loser = await getPersonForEdit(db, plan.loserId);
  if (!winner || !loser) throw new InvalidInputError("merge.error.notFound");
  if (loser.archivedAt) throw new InvalidInputError("merge.error.alreadyArchived");

  const moved: { table: string; id: string }[] = [];

  for (const owned of OWNED) {
    // Only rows that would not collide with something the winner already has.
    // A colliding row stays on the loser, which is archived rather than deleted,
    // so nothing is lost and undo has less to put back.
    const keep = owned.conflictOn?.length
      ? sql`and not exists (
          select 1 from ${sql.identifier(owned.table)} w
          where w.${sql.identifier(owned.column)} = ${plan.winnerId}::uuid
            and ${sql.join(
              owned.conflictOn.map((c) => sql`w.${sql.identifier(c)} = t.${sql.identifier(c)}`),
              sql` and `,
            )}
            ${owned.liveOnly ? sql`and ${sql.raw(owned.liveOnly)}` : sql``}
        )`
      : sql``;

    const rows = (await db.execute(sql`
      update ${sql.identifier(owned.table)} t
         set ${sql.identifier(owned.column)} = ${plan.winnerId}::uuid
       where t.${sql.identifier(owned.column)} = ${plan.loserId}::uuid
         ${keep}
      returning t.${sql.identifier(owned.key ?? "id")} as id`)) as unknown as {
      id: string;
    }[];

    for (const row of rows) moved.push({ table: owned.table, id: row.id });
  }

  // Relationships point at two people, so both ends are re-pointed.
  for (const column of ["person_id", "related_person_id"]) {
    const rows = (await db.execute(sql`
      update relationships
         set ${sql.identifier(column)} = ${plan.winnerId}::uuid
       where ${sql.identifier(column)} = ${plan.loserId}::uuid
      returning id`)) as unknown as { id: string }[];
    for (const row of rows) moved.push({ table: `relationships.${column}`, id: row.id });
  }

  // A relationship can now point at the same person on both ends, which is not a
  // relationship. Those are removed rather than left as nonsense.
  await db.execute(sql`
    delete from relationships where person_id = related_person_id and person_id = ${plan.winnerId}::uuid`);

  const survived = applyChoices(winner, loser, plan.take);
  await db
    .update(people)
    .set({
      firstName: survived.firstName,
      lastName: survived.lastName,
      preferredName: survived.preferredName ?? null,
      dateOfBirth: survived.dateOfBirth ?? null,
      lifecycleStatus: survived.lifecycleStatus,
      membershipDate: survived.membershipDate ?? null,
      firstVisitOn: survived.firstVisitOn ?? null,
      updatedAt: new Date(),
    })
    .where(eq(people.id, plan.winnerId));

  await db
    .update(people)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(people.id, plan.loserId));

  const [merge] = await db
    .insert(personMerges)
    .values({
      tenantId: actor.tenantId,
      winnerId: plan.winnerId,
      loserId: plan.loserId,
      winnerBefore: winner,
      movedRows: moved,
      mergedByUserId: actor.userId ?? null,
    })
    .returning({ id: personMerges.id });
  if (!merge) throw new Error("Merge insert returned no row.");

  return { mergeId: merge.id, movedRows: moved.length };
}

/** Field by field, whose value survives. The winner's, unless the loser's was chosen. */
function applyChoices(
  winner: PersonInput,
  loser: PersonInput,
  take: MergePlan["take"],
): PersonInput {
  const pick = <K extends keyof PersonInput>(key: K): PersonInput[K] =>
    take?.[key] === "loser" ? loser[key] : winner[key];

  return {
    firstName: pick("firstName") || winner.firstName,
    lastName: pick("lastName") || winner.lastName,
    preferredName: pick("preferredName"),
    dateOfBirth: pick("dateOfBirth"),
    lifecycleStatus: pick("lifecycleStatus"),
    membershipDate: pick("membershipDate"),
    firstVisitOn: pick("firstVisitOn"),
  };
}

export interface MergeSummary {
  id: string;
  winnerId: string;
  loserId: string;
  winnerName: string;
  loserName: string;
  mergedAt: Date;
  undoneAt: Date | null;
  canUndo: boolean;
}

const withinWindow = (at: Date): boolean =>
  Date.now() - at.getTime() <= MERGE_UNDO_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export async function listMerges(db: Tx): Promise<MergeSummary[]> {
  const rows = (await db.execute(sql`
    select m.id, m.winner_id, m.loser_id, m.merged_at, m.undone_at,
           w.first_name || ' ' || w.last_name as winner_name,
           l.first_name || ' ' || l.last_name as loser_name
      from person_merges m
      join people w on w.id = m.winner_id
      join people l on l.id = m.loser_id
     order by m.merged_at desc
     limit 50`)) as unknown as {
    id: string;
    winner_id: string;
    loser_id: string;
    // A raw execute hands back what the driver gave it. Drizzle's date parsers
    // are installed for typed selects, not for this, so the timestamps arrive as
    // strings and are turned into dates here rather than at four call sites.
    merged_at: string | Date;
    undone_at: string | Date | null;
    winner_name: string;
    loser_name: string;
  }[];

  const asDate = (v: string | Date) => (v instanceof Date ? v : new Date(v));

  return rows.map((r) => ({
    id: r.id,
    winnerId: r.winner_id,
    loserId: r.loser_id,
    winnerName: r.winner_name,
    loserName: r.loser_name,
    mergedAt: asDate(r.merged_at),
    undoneAt: r.undone_at ? asDate(r.undone_at) : null,
    canUndo: !r.undone_at && withinWindow(asDate(r.merged_at)),
  }));
}

/**
 * Puts a merge back.
 *
 * Exactly the rows that moved go back, named individually rather than found
 * again by a rule. A rule would also catch rows created since the merge, which
 * belong to the surviving person and were never part of it.
 */
export async function undoMerge(
  db: Tx,
  actor: { tenantId: string; role: TenantRole },
  mergeId: string,
): Promise<{ restoredRows: number }> {
  if (!canArchivePeople(actor.role)) throw new PermissionError(actor.role, "mergePeople");

  const [merge] = await db.select().from(personMerges).where(eq(personMerges.id, mergeId)).limit(1);
  if (!merge) throw new InvalidInputError("merge.error.notFound");
  if (merge.undoneAt) throw new InvalidInputError("merge.error.alreadyUndone");
  if (!withinWindow(merge.mergedAt)) throw new InvalidInputError("merge.error.tooOld");

  const moved = merge.movedRows ?? [];
  let restored = 0;

  for (const row of moved) {
    const [table, column] = row.table.includes(".")
      ? row.table.split(".")
      : [row.table, row.table === "person_tags" ? "person_id" : row.table === "custom_field_values" ? "entity_id" : "person_id"];

    const key = KEYS[table!] ?? "id";
    const result = (await db.execute(sql`
      update ${sql.identifier(table!)}
         set ${sql.identifier(column!)} = ${merge.loserId}::uuid
       where ${sql.identifier(column!)} = ${merge.winnerId}::uuid
         and ${sql.identifier(key)} = ${row.id}::uuid
      returning ${sql.identifier(key)}`)) as unknown as unknown[];
    restored += result.length;
  }

  const before = merge.winnerBefore as PersonInput | null;
  if (before) {
    await db
      .update(people)
      .set({
        firstName: before.firstName,
        lastName: before.lastName,
        preferredName: before.preferredName ?? null,
        dateOfBirth: before.dateOfBirth ?? null,
        lifecycleStatus: before.lifecycleStatus,
        membershipDate: before.membershipDate ?? null,
        firstVisitOn: before.firstVisitOn ?? null,
        updatedAt: new Date(),
      })
      .where(eq(people.id, merge.winnerId));
  }

  await db
    .update(people)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(eq(people.id, merge.loserId));

  await db.update(personMerges).set({ undoneAt: new Date() }).where(eq(personMerges.id, mergeId));

  return { restoredRows: restored };
}

export interface DuplicatePair {
  a: { id: string; name: string };
  b: { id: string; name: string };
  confidence: Confidence;
  reason: string;
}

/**
 * The review queue (R2.8): every pair in the directory that might be one person.
 *
 * Built from the same matching rules the import uses, so what the import calls a
 * duplicate and what this calls a duplicate are the same thing. Two lists that
 * disagree about what a duplicate is would be worse than one.
 */
export async function findDuplicatePairs(db: Tx): Promise<DuplicatePair[]> {
  const index = await buildMatchIndex(db);
  const seen = new Set<string>();
  const pairs: DuplicatePair[] = [];

  for (const person of index.all) {
    const matches = findMatches(index, {
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.emails[0] ?? null,
      phone: person.phones[0] ?? null,
      dateOfBirth: person.dateOfBirth,
    });

    for (const match of matches) {
      if (match.personId === person.id) continue;
      // One row per pair, whichever way round it was found.
      const key = [person.id, match.personId].sort().join(":");
      if (seen.has(key)) continue;
      seen.add(key);

      pairs.push({
        a: { id: person.id, name: `${person.preferredName ?? person.firstName} ${person.lastName}` },
        b: { id: match.personId, name: match.displayName },
        confidence: match.confidence,
        reason: match.reason,
      });
    }
  }

  const rank = { certain: 3, likely: 2, possible: 1 };
  return pairs.sort((x, y) => rank[y.confidence] - rank[x.confidence]);
}
