import { and, desc, eq, sql } from "drizzle-orm";
import type { Tx } from "../client";
import type { Permission } from "../permissions";
import { importBatches, importRows } from "../schema/imports";
import { members } from "../schema/members";
import { canArchivePeople, PermissionError, type TenantRole } from "../roles";
import { InvalidInputError } from "../errors";
import { updatePerson, type PersonInput } from "../repo/members";

/**
 * R19.4. Undoing a completed import, as one operation, for thirty days.
 *
 * The case this exists for is a spreadsheet imported at 9pm on a Saturday with
 * the columns shifted by one. The church notices as the doors open. "Restore the
 * database" is not an answer at that point, and neither is asking a volunteer to
 * find and fix 400 records by hand.
 */

/** R19.4 says thirty days. After that the import is part of the church's history. */
export const ROLLBACK_WINDOW_DAYS = 30;

export interface BatchSummary {
  id: string;
  filename: string;
  status: string;
  /** R19.5. "members" or "groups". A group batch is undone by its own path. */
  kind: string;
  rowsCreated: number;
  rowsUpdated: number;
  rowsSkipped: number;
  rowsFailed: number;
  committedAt: Date | null;
  rolledBackAt: Date | null;
  /** False once the window has closed, or once it has already been undone. */
  canRollBack: boolean;
}

const withinWindow = (committedAt: Date | null): boolean => {
  if (!committedAt) return false;
  const age = Date.now() - committedAt.getTime();
  return age <= ROLLBACK_WINDOW_DAYS * 24 * 60 * 60 * 1000;
};

export async function listImports(db: Tx): Promise<BatchSummary[]> {
  const rows = await db
    .select()
    .from(importBatches)
    .orderBy(desc(importBatches.createdAt))
    .limit(50);

  return rows.map((b) => ({
    id: b.id,
    filename: b.filename,
    kind: b.kind,
    status: b.status,
    rowsCreated: b.rowsCreated,
    rowsUpdated: b.rowsUpdated,
    rowsSkipped: b.rowsSkipped,
    rowsFailed: b.rowsFailed,
    committedAt: b.committedAt,
    rolledBackAt: b.rolledBackAt,
    canRollBack: b.status === "committed" && withinWindow(b.committedAt),
  }));
}

export interface RollbackResult {
  removed: number;
  restored: number;
  /** Created by the import, changed since, so archived rather than removed. */
  archived: number;
}

/**
 * Undoes an import.
 *
 * A person the import created is removed. That is the one place in the product
 * where a person row is deleted outside a data subject request, and it is
 * deliberate: the row is not a record of somebody the church knows, it is a
 * record of a mistake, and archiving would leave four hundred of them sitting in
 * the archived view forever. The audit log and the import's own rows still hold
 * everything that was written, so nothing becomes unknowable.
 *
 * Unless somebody has touched them since. A person who was created by the import
 * and then edited, tagged, or written a note about has become real to the
 * church, so they are archived instead and counted separately. Deleting them
 * would throw away work that was not part of the mistake.
 *
 * A person the import updated is put back to the values recorded before it ran.
 */
/**
 * Has anybody worked on this person since the import created them?
 *
 * Compared against their own creation rather than against the batch's clock. A
 * row created and never edited has updated_at equal to created_at, exactly,
 * because Postgres gives both the same transaction timestamp. Comparing to the
 * batch instead needs a tolerance, and a tolerance is a guess.
 *
 * A note or a tag counts too. Neither touches the person row, and both mean
 * somebody has decided this person is real.
 */
async function touchedSince(
  db: Tx,
  person: { id: string; createdAt: Date; updatedAt: Date },
): Promise<boolean> {
  if (person.updatedAt.getTime() !== person.createdAt.getTime()) return true;

  const [{ n } = { n: 0 }] = await db.execute<{ n: number }>(sql`
    select (
      (select count(*) from notes where member_id = ${person.id}) +
      (select count(*) from member_tags where member_id = ${person.id})
    )::int as n`);

  return Number(n) > 0;
}

export async function rollbackImport(
  db: Tx,
  actor: { tenantId: string; role: TenantRole; userId?: string; permissions?: readonly Permission[] | null },
  batchId: string,
): Promise<RollbackResult> {
  // Rolling back can remove hundreds of members at once, so it sits with the
  // roles that may archive rather than with the roles that may edit.
  if (!canArchivePeople(actor)) throw new PermissionError(actor.role, "rollbackImport");

  const [batch] = await db.select().from(importBatches).where(eq(importBatches.id, batchId)).limit(1);
  if (!batch) throw new InvalidInputError("error.notFound.import");
  if (batch.kind === "groups") throw new InvalidInputError("import.rollback.wrongKind");
  if (batch.status !== "committed") throw new InvalidInputError("import.rollback.alreadyDone");
  if (!withinWindow(batch.committedAt)) throw new InvalidInputError("import.rollback.tooOld");

  const rows = await db
    .select()
    .from(importRows)
    .where(and(eq(importRows.batchId, batchId), sql`${importRows.memberId} is not null`));

  const result: RollbackResult = { removed: 0, restored: 0, archived: 0 };

  for (const row of rows) {
    if (!row.memberId) continue;

    if (row.outcome === "create") {
      const [current] = await db
        .select({ id: members.id, createdAt: members.createdAt, updatedAt: members.updatedAt })
        .from(members)
        .where(eq(members.id, row.memberId))
        .limit(1);
      if (!current) continue;

      if (await touchedSince(db, current)) {
        await db
          .update(members)
          .set({ archivedAt: new Date(), updatedAt: new Date() })
          .where(eq(members.id, row.memberId));
        result.archived++;
      } else {
        await db.delete(members).where(eq(members.id, row.memberId));
        result.removed++;
      }
      continue;
    }

    if (row.outcome === "update" && row.before) {
      await updatePerson(db, actor, row.memberId, row.before as PersonInput);
      result.restored++;
    }
  }

  await db
    .update(importBatches)
    .set({ status: "rolled_back", rolledBackAt: new Date() })
    .where(eq(importBatches.id, batchId));

  return result;
}
