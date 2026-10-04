/**
 * R19.5, R9.5. Bringing a church's groups across with its people.
 *
 * A group file is one line per person per group, which is how all three of
 * Planning Center, Breeze and ChurchTrac export them. So a row here is a
 * membership: it names a group, names a person, and the import's job is to find
 * that person among the people already imported.
 *
 * Finding them is the whole difficulty, and it uses the same matcher the people
 * import uses to spot duplicates. A row whose person cannot be found with
 * certainty fails rather than guessing, because putting the wrong Sarah into a
 * small group is a mistake a church will not notice and cannot see.
 *
 * As with people, `plan()` decides and `commit()` carries out exactly what it
 * was given, so the preview cannot disagree with the write.
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import type { MessageKey } from "@hearth/i18n";
import type { Tx } from "../client";
import type { Permission } from "../permissions";
import { importBatches, importRows } from "../schema/imports";
import { groups, groupMemberships, groupTypes } from "../schema/groups";
import { canManageGroups, addToGroup, createGroup } from "../repo/groups";
import { PermissionError, type TenantRole } from "../roles";
import type { Sheet } from "./csv";
import { parseImportedDate } from "./columns";
import { parseGroupRole } from "./group-columns";
import { buildMatchIndex, findMatches, type MatchIndex } from "./match";

export interface PlannedGroupRow {
  lineNumber: number;
  outcome: "create" | "skip" | "fail";
  /** A catalogue key explaining a skip or a failure. */
  reason?: MessageKey;
  reasonParams?: Record<string, string>;
  groupName: string;
  /** Set when the group is already there. */
  groupId?: string;
  /** True when this row is the one that brings the group into existence. */
  makesGroup?: boolean;
  typeName?: string;
  personId?: string;
  personName: string;
  role: "leader" | "coleader" | "member";
  joinedOn?: string;
  source: Record<string, string>;
}

export interface GroupPlan {
  filename: string;
  headers: string[];
  mapping: Record<string, string>;
  rows: PlannedGroupRow[];
  totals: { create: number; skip: number; fail: number };
  /** The groups this file would bring into existence, in the order they appear. */
  newGroups: string[];
}

const value = (row: Record<string, string>, mapping: Record<string, string>, key: string): string => {
  for (const [header, target] of Object.entries(mapping)) {
    if (target === key) return (row[header] ?? "").trim();
  }
  return "";
};

const fold = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, " ");

/** Reads the file into a decision per row. Writes nothing. */
export async function planGroups(
  db: Tx,
  input: { filename: string; sheet: Sheet; mapping: Record<string, string> },
): Promise<GroupPlan> {
  const sheet = input.sheet;
  const index: MatchIndex = await buildMatchIndex(db);

  const existing = await db
    .select({ id: groups.id, name: groups.name })
    .from(groups)
    .where(isNull(groups.archivedAt));
  const byName = new Map(existing.map((row) => [fold(row.name), row.id]));

  const members = await db
    .select({ groupId: groupMemberships.groupId, personId: groupMemberships.personId, role: groupMemberships.role })
    .from(groupMemberships)
    .where(isNull(groupMemberships.leftOn));
  const already = new Map(members.map((row) => [`${row.groupId}:${row.personId}`, row.role]));

  const planned = new Set<string>();
  const newGroups: string[] = [];
  const rows: PlannedGroupRow[] = [];

  for (const [i, raw] of sheet.rows.entries()) {
    const lineNumber = i + 2;
    const groupName = value(raw, input.mapping, "groupName");
    const firstName = value(raw, input.mapping, "firstName");
    const lastName = value(raw, input.mapping, "lastName");
    const email = value(raw, input.mapping, "email");
    const phone = value(raw, input.mapping, "phone");
    const role = parseGroupRole(value(raw, input.mapping, "role"));
    const typeName = value(raw, input.mapping, "groupType");
    const personName = [firstName, lastName].filter(Boolean).join(" ") || email || "";

    const base = { lineNumber, groupName, personName, role, source: raw, typeName: typeName || undefined };

    if (!groupName) {
      rows.push({ ...base, outcome: "fail", reason: "import.group.noName" });
      continue;
    }
    if (!firstName && !lastName && !email && !phone) {
      rows.push({ ...base, outcome: "fail", reason: "import.group.noPerson" });
      continue;
    }

    const joined = value(raw, input.mapping, "joinedOn");
    let joinedOn: string | undefined;
    if (joined) {
      const parsed = parseImportedDate(joined);
      if ("error" in parsed) {
        rows.push({
          ...base,
          outcome: "fail",
          reason: "import.group.badDate",
          reasonParams: { value: joined },
        });
        continue;
      }
      joinedOn = parsed.value;
    }

    const matches = findMatches(index, { firstName, lastName, email, phone });
    const certain = matches.filter((match) => match.confidence === "certain");

    // Nothing short of certain is acted on. Two people of one name and no
    // address between them is exactly the row a church cannot check afterwards.
    if (certain.length !== 1) {
      const reason: MessageKey =
        certain.length > 1 || matches.length > 1
          ? "import.group.ambiguous"
          : matches.length === 1
            ? "import.group.unsure"
            : "import.group.noMatch";
      rows.push({ ...base, joinedOn, outcome: "fail", reason, reasonParams: { name: personName } });
      continue;
    }

    const personId = certain[0]!.personId;
    const key = fold(groupName);
    const groupId = byName.get(key);

    // The group is made by the first row that names it, and every later row in
    // the file joins the same one.
    let makesGroup = false;
    if (!groupId && !planned.has(key)) {
      planned.add(key);
      newGroups.push(groupName.trim());
      makesGroup = true;
    }

    if (groupId && already.get(`${groupId}:${personId}`) === role) {
      rows.push({
        ...base,
        groupId,
        personId,
        joinedOn,
        outcome: "skip",
        reason: "import.group.alreadyIn",
        reasonParams: { name: personName },
      });
      continue;
    }

    rows.push({ ...base, groupId, personId, joinedOn, makesGroup, outcome: "create" });
  }

  const totals = { create: 0, skip: 0, fail: 0 };
  for (const row of rows) totals[row.outcome]++;

  return { filename: input.filename, headers: sheet.headers, mapping: input.mapping, rows, totals, newGroups };
}

export interface GroupCommitResult {
  batchId: string;
  joined: number;
  groupsCreated: number;
  skipped: number;
  failed: number;
}

/**
 * Carries out a group plan, in one transaction and recording every row.
 *
 * The record is what makes R19.4 work on a group file too: a rollback takes the
 * people back out of the groups, and takes away the groups the file created if
 * nobody else has joined them since.
 */
export async function commitGroups(
  db: Tx,
  actor: { tenantId: string; role: TenantRole; userId?: string; permissions?: readonly Permission[] | null },
  plan: GroupPlan,
): Promise<GroupCommitResult> {
  if (!canManageGroups(actor.role)) throw new PermissionError(actor.role, "manageGroups");

  const [batch] = await db
    .insert(importBatches)
    .values({
      tenantId: actor.tenantId,
      filename: plan.filename,
      kind: "groups",
      status: "committed",
      mapping: plan.mapping,
      duplicateStrategy: "skip",
      rowsTotal: plan.rows.length,
      startedByUserId: actor.userId ?? null,
      committedAt: new Date(),
    })
    .returning({ id: importBatches.id });
  if (!batch) throw new Error("Import batch insert returned no row.");

  const types = await db
    .select({ id: groupTypes.id, name: groupTypes.name })
    .from(groupTypes)
    .where(isNull(groupTypes.archivedAt));
  const typeByName = new Map(types.map((row) => [fold(row.name), row.id]));

  // Read again here rather than trusting the plan. A group name is unique in a
  // church, so a group created between the preview and this would make the
  // whole import fail on a constraint.
  const here = await db
    .select({ id: groups.id, name: groups.name })
    .from(groups)
    .where(isNull(groups.archivedAt));
  const made = new Map(here.map((row) => [fold(row.name), row.id]));
  const result: GroupCommitResult = {
    batchId: batch.id, joined: 0, groupsCreated: 0, skipped: 0, failed: 0,
  };

  for (const row of plan.rows) {
    if (row.outcome !== "create") {
      await record(db, actor, batch.id, row, null, false);
      if (row.outcome === "fail") result.failed++;
      else result.skipped++;
      continue;
    }

    const key = fold(row.groupName);
    let groupId = made.get(key) ?? row.groupId;
    let created = false;

    if (!groupId) {
      const group = await createGroup(db, { tenantId: actor.tenantId, role: actor.role }, {
        name: row.groupName.trim(),
        typeId: row.typeName ? (typeByName.get(fold(row.typeName)) ?? null) : null,
      });
      groupId = group.id;
      made.set(key, groupId);
      created = true;
      result.groupsCreated++;
    }

    await addToGroup(db, { tenantId: actor.tenantId, role: actor.role }, {
      groupId,
      personId: row.personId!,
      role: row.role,
      ...(row.joinedOn ? { joinedOn: row.joinedOn } : {}),
    });

    await record(db, actor, batch.id, { ...row, groupId }, groupId, created);
    result.joined++;
  }

  await db
    .update(importBatches)
    .set({
      rowsCreated: result.joined,
      // The groups it brought into existence, which is the number a church
      // reads before deciding to undo it.
      rowsUpdated: result.groupsCreated,
      rowsSkipped: result.skipped,
      rowsFailed: result.failed,
    })
    .where(eq(importBatches.id, batch.id));

  return result;
}

async function record(
  db: Tx,
  actor: { tenantId: string },
  batchId: string,
  row: PlannedGroupRow,
  groupId: string | null,
  groupCreated: boolean,
): Promise<void> {
  await db.insert(importRows).values({
    tenantId: actor.tenantId,
    batchId,
    lineNumber: row.lineNumber,
    outcome: row.outcome,
    personId: row.personId ?? null,
    groupId: groupId ?? row.groupId ?? null,
    groupCreated,
    reason: row.reason ?? null,
    source: row.source,
  });
}

/**
 * R19.4. Undoing a group import.
 *
 * Somebody taken back out of a group leaves the day they left, the way leaving
 * a group works everywhere else in the product. A group the file created is
 * archived only when nobody has joined it since, because a church that started
 * meeting on Tuesday should not lose the group it has been using.
 */
export async function rollbackGroupImport(
  db: Tx,
  actor: { tenantId: string; role: TenantRole },
  batchId: string,
): Promise<{ left: number; groupsArchived: number; groupsKept: number }> {
  if (!canManageGroups(actor.role)) throw new PermissionError(actor.role, "manageGroups");

  const rows = await db
    .select()
    .from(importRows)
    .where(and(eq(importRows.batchId, batchId), eq(importRows.outcome, "create")));

  const result = { left: 0, groupsArchived: 0, groupsKept: 0 };
  const touched = new Set<string>();

  for (const row of rows) {
    if (!row.groupId || !row.personId) continue;
    const done = await db
      .update(groupMemberships)
      .set({ leftOn: new Date().toISOString().slice(0, 10), updatedAt: new Date() })
      .where(
        and(
          eq(groupMemberships.groupId, row.groupId),
          eq(groupMemberships.personId, row.personId),
          isNull(groupMemberships.leftOn),
        ),
      )
      .returning({ id: groupMemberships.id });
    if (done.length > 0) result.left++;
    if (row.groupCreated) touched.add(row.groupId);
  }

  for (const groupId of touched) {
    const [remaining] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(groupMemberships)
      .where(and(eq(groupMemberships.groupId, groupId), isNull(groupMemberships.leftOn)));

    if ((remaining?.count ?? 0) > 0) {
      result.groupsKept++;
      continue;
    }
    await db
      .update(groups)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(groups.id, groupId));
    result.groupsArchived++;
  }

  await db
    .update(importBatches)
    .set({ status: "rolled_back", rolledBackAt: new Date() })
    .where(eq(importBatches.id, batchId));

  return result;
}
