import { eq } from "drizzle-orm";
import type { MessageKey } from "@connectapp/i18n";
import type { Tx } from "../client";
import type { Permission } from "../permissions";
import { importBatches, importRows } from "../schema/imports";
import { canEditPeople, PermissionError, type TenantRole } from "../roles";
import { createPerson, updatePerson, getPersonForEdit, type PersonInput, type LifecycleStatus, type HouseholdRole } from "../repo/members";
import { listCustomFields, setCustomValues, coerceCustomValue, type CustomFieldDef } from "../repo/custom-fields";
import { ensureTag, setPersonTag } from "../repo/tags";
import { churchStanding } from "../repo/provisional";
import type { Sheet } from "./csv";
import {
  PERSON_FIELDS, parseImportedDate, parseLifecycle, parseHouseholdRole,
  parseMarital, splitValues,
} from "./columns";
import { buildMatchIndex, findMatches, indexNewPerson, type Match, type MatchIndex } from "./match";

/**
 * R19.2 and R19.3. The dry run and the commit are the same code path.
 *
 * That is the point. A preview that is produced by different logic from the
 * write is a preview that can be wrong, and a preview nobody can trust is worse
 * than no preview, because members stop reading it. `plan()` decides what every
 * row would do, and `commit()` carries out exactly the plan it was given.
 */

export type DuplicateStrategy = "skip" | "update" | "create";

export interface PlannedRow {
  lineNumber: number;
  outcome: "create" | "update" | "skip" | "fail";
  /** A catalogue key explaining a skip or a failure. */
  reason?: MessageKey;
  /** Values for the message named by `reason`. */
  reasonParams?: Record<string, string>;
  person: PersonInput;
  /** R2.3. Tag names from the file, applied after the person is written. */
  tags: string[];
  custom: Record<string, unknown>;
  matches: Match[];
  /** Set when the row will update, or would have. */
  targetId?: string;
  source: Record<string, string>;
}

export interface Plan {
  filename: string;
  headers: string[];
  mapping: Record<string, string>;
  strategy: DuplicateStrategy;
  rows: PlannedRow[];
  totals: { create: number; update: number; skip: number; fail: number };
  /** R1.1. Set while the church is still being reviewed, so a screen can say so. */
  cap?: { limit: number; room: number; held: number };
}

/** Marks an id that only exists in this plan, not in the database. */
const PLANNED = "planned:";

const value = (row: Record<string, string>, mapping: Record<string, string>, key: string): string => {
  for (const [header, target] of Object.entries(mapping)) {
    if (target === key) return (row[header] ?? "").trim();
  }
  return "";
};

/**
 * Turns a file into a decision per row, writing nothing.
 *
 * Runs inside a transaction only so it can read the church; it performs no
 * writes and the caller is free to roll it back.
 */
export async function plan(
  db: Tx,
  input: {
    filename: string;
    /** Already read, because a CSV and a workbook arrive differently. */
    sheet: Sheet;
    mapping: Record<string, string>;
    strategy: DuplicateStrategy;
    tenantId: string;
  },
): Promise<Plan> {
  const sheet = input.sheet;
  const custom = await listCustomFields(db, "person");
  const customById = new Map(custom.map((f) => [f.id, f]));
  const index = await buildMatchIndex(db);

  // Rows planned as creates are added to the index as they go, so the same
  // person appearing twice in one file is caught. A church's export often has a
  // row per household member per group, and without this an import of 500 rows
  // creates the same family four times.
  /*
   * R1.1. A church still being reviewed holds 25 members.
   *
   * The rows past that become skips here, in the plan, rather than an error
   * thrown halfway through the write. The person then sees on the Check step
   * exactly how many of their file goes in now, and the rest is a second import
   * once the church is approved, against a file they still have.
   */
  const standing = await churchStanding(db, input.tenantId);
  let room = standing.remaining ?? Number.POSITIVE_INFINITY;

  const rows: PlannedRow[] = [];
  sheet.rows.forEach((row, i) => {
    const planned = planRow(row, sheet.lineNumbers[i] ?? i + 2, input.mapping, input.strategy, index, customById);

    if (planned.outcome === "create" && room <= 0) {
      rows.push({
        ...planned,
        outcome: "skip",
        reason: "import.skip.capped",
        reasonParams: { limit: String(standing.limit) },
      });
      return;
    }

    rows.push(planned);
    if (planned.outcome === "create") {
      room -= 1;
      indexNewPerson(index, {
        id: `${PLANNED}${planned.lineNumber}`,
        firstName: planned.person.firstName,
        lastName: planned.person.lastName,
        dateOfBirth: planned.person.dateOfBirth,
        email: planned.person.email,
        phone: planned.person.phone,
      });
    }
  });

  const totals = { create: 0, update: 0, skip: 0, fail: 0 };
  for (const r of rows) totals[r.outcome]++;

  return {
    filename: input.filename,
    headers: sheet.headers,
    mapping: input.mapping,
    strategy: input.strategy,
    rows,
    totals,
    cap: standing.approved
      ? undefined
      : { limit: standing.limit, room: standing.remaining ?? 0, held: standing.members },
  };
}

function planRow(
  source: Record<string, string>,
  lineNumber: number,
  mapping: Record<string, string>,
  strategy: DuplicateStrategy,
  index: MatchIndex,
  custom: Map<string, CustomFieldDef>,
): PlannedRow {
  const get = (key: string) => value(source, mapping, key);

  const firstName = get("firstName");
  const lastName = get("lastName");

  const fail = (reason: MessageKey, params?: Record<string, string>): PlannedRow => ({
    lineNumber,
    outcome: "fail",
    reason,
    reasonParams: params,
    person: { firstName, lastName, lifecycleStatus: "visitor" },
    tags: [],
    custom: {},
    matches: [],
    source,
  });

  // A row with no name is not a person. Everything else can be filled in later.
  if (!firstName || !lastName) return fail("import.error.noName");

  const dates: Record<string, string> = {};
  for (const key of ["dateOfBirth", "membershipDate", "firstVisitOn"]) {
    const raw = get(key);
    if (!raw) continue;
    const parsed = parseImportedDate(raw);
    if ("error" in parsed) {
      const field = PERSON_FIELDS.find((f) => f.key === key)!;
      return fail("import.error.badDate", { field: field.label, value: raw });
    }
    dates[key] = parsed.value;
  }

  /*
   * R2.4. The address, from one column or from five.
   *
   * A Planning Center export carries the street, the city, the state and the
   * zip as their own columns; a spreadsheet a church typed itself usually has
   * one line. Both arrive here, and anything with no street at all is left off
   * rather than written as a city on its own.
   */
  const line1 = get("address");
  const city = get("city");
  const region = get("region");
  const postalCode = get("postalCode");
  const line2 = get("addressLine2");
  const address =
    line1 && (city || region || postalCode || line2)
      ? { line1, line2: line2 || null, city: city || null, region: region || null, postalCode: postalCode || null }
      : line1 || null;

  const person: PersonInput = {
    firstName,
    lastName,
    preferredName: get("preferredName") || null,
    email: get("email") || null,
    phone: get("phone") || null,
    dateOfBirth: dates["dateOfBirth"] || null,
    membershipDate: dates["membershipDate"] || null,
    firstVisitOn: dates["firstVisitOn"] || null,
    lifecycleStatus: parseLifecycle(get("lifecycleStatus")) as LifecycleStatus,
    householdName: get("householdName") || null,
    householdRole: parseHouseholdRole(get("householdRole")) as HouseholdRole,
    address,
    maritalStatus: parseMarital(get("maritalStatus")),
    allergies: get("allergies") || null,
    medicalNote: get("medicalNote") || null,
  };

  const tagNames = splitValues(get("tags"));

  const customValues: Record<string, unknown> = {};
  for (const [header, target] of Object.entries(mapping)) {
    if (!target.startsWith("cf:")) continue;
    const field = custom.get(target.slice(3));
    if (!field) continue;
    const raw = (source[header] ?? "").trim();
    const coerced = coerceCustomValue(field, field.type === "multi_select" ? splitList(raw) : raw);
    if ("error" in coerced) return fail("import.error.badValue", { field: field.label, value: raw });
    customValues[field.id] = coerced.value;
  }

  const matches = findMatches(index, person);
  const strongest = matches[0];

  // A match against a row earlier in the same file. There is nothing to update,
  // because the person does not exist yet, so the only honest outcomes are skip
  // or create. The reason names the line so they can go and look at it.
  if (strongest?.memberId.startsWith(PLANNED) && strategy !== "create") {
    return {
      lineNumber,
      outcome: "skip",
      reason: "import.skip.duplicateInFile",
      reasonParams: { line: strongest.memberId.slice(PLANNED.length) },
      person,
      tags: tagNames,
      custom: customValues,
      matches: [],
      source,
    };
  }

  if (strongest && !strongest.memberId.startsWith(PLANNED)) {
    if (strategy === "skip") {
      return { lineNumber, outcome: "skip", reason: "import.skip.duplicate", person, tags: tagNames, custom: customValues, matches, targetId: strongest.memberId, source };
    }
    if (strategy === "update") {
      // Only a match somebody could defend is written over. A shared surname or
      // a household phone is not enough to overwrite a record.
      if (strongest.confidence === "certain") {
        return { lineNumber, outcome: "update", person, tags: tagNames, custom: customValues, matches, targetId: strongest.memberId, source };
      }
      return { lineNumber, outcome: "skip", reason: "import.skip.unsure", person, tags: tagNames, custom: customValues, matches, targetId: strongest.memberId, source };
    }
  }

  return { lineNumber, outcome: "create", person, tags: tagNames, custom: customValues, matches, source };
}

/** "Vegetarian; Gluten free" and "Vegetarian, Gluten free" are both a list. */
const splitList = (raw: string): string[] =>
  raw.split(/[;,|]/).map((v) => v.trim()).filter(Boolean);

export interface CommitResult {
  batchId: string;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

/**
 * Carries out a plan, recording every row.
 *
 * One transaction. An import that half succeeded is the worst outcome available:
 * the church cannot tell what is theirs and what came from the file, and the
 * rollback has nothing coherent to undo.
 *
 * `before` is captured for every update, which is what makes R19.4 a restore
 * rather than a guess.
 */
export async function commit(
  db: Tx,
  actor: { tenantId: string; role: TenantRole; userId?: string; permissions?: readonly Permission[] | null },
  plan: Plan,
): Promise<CommitResult> {
  if (!canEditPeople(actor)) throw new PermissionError(actor.role, "addPerson");

  const [batch] = await db
    .insert(importBatches)
    .values({
      tenantId: actor.tenantId,
      filename: plan.filename,
      status: "committed",
      mapping: plan.mapping,
      duplicateStrategy: plan.strategy,
      rowsTotal: plan.rows.length,
      startedByUserId: actor.userId ?? null,
      committedAt: new Date(),
    })
    .returning({ id: importBatches.id });
  if (!batch) throw new Error("Import batch insert returned no row.");

  const result: CommitResult = { batchId: batch.id, created: 0, updated: 0, skipped: 0, failed: 0 };

  for (const row of plan.rows) {
    if (row.outcome === "fail" || row.outcome === "skip") {
      await record(db, actor, batch.id, row, null, null);
      if (row.outcome === "fail") result.failed++;
      else result.skipped++;
      continue;
    }

    if (row.outcome === "update" && row.targetId) {
      const before = await getPersonForEdit(db, row.targetId);
      // The plan was made against the church as it was. If the person has gone
      // since, the row becomes a skip rather than an error.
      if (!before) {
        await record(db, actor, batch.id, { ...row, outcome: "skip", reason: "import.skip.vanished" }, null, null);
        result.skipped++;
        continue;
      }
      await updatePerson(db, actor, row.targetId, merged(before, row.person));
      await writeCustom(db, actor, row.targetId, row.custom);
      await writeTags(db, actor, row.targetId, row.tags);
      await record(db, actor, batch.id, row, row.targetId, before);
      result.updated++;
      continue;
    }

    const created = await createPerson(db, actor, row.person);
    await writeCustom(db, actor, created.id, row.custom);
    await writeTags(db, actor, created.id, row.tags);
    await record(db, actor, batch.id, row, created.id, null);
    result.created++;
  }

  await db
    .update(importBatches)
    .set({
      rowsCreated: result.created,
      rowsUpdated: result.updated,
      rowsSkipped: result.skipped,
      rowsFailed: result.failed,
    })
    .where(eq(importBatches.id, batch.id));

  return result;
}

/**
 * An update fills gaps, it does not blank fields.
 *
 * A file with an empty phone column means "this file does not carry phone
 * numbers", not "delete every phone number". The second reading loses data the
 * church typed in by hand, and there is no way to tell the two apart from the
 * file, so the safe reading is the only one on offer.
 */
function merged(before: PersonInput, incoming: PersonInput): PersonInput {
  const keep = <T>(next: T | null | undefined, current: T | null | undefined): T | null =>
    next === null || next === undefined || next === "" ? (current ?? null) : next;

  return {
    firstName: incoming.firstName || before.firstName,
    lastName: incoming.lastName || before.lastName,
    preferredName: keep(incoming.preferredName, before.preferredName),
    email: keep(incoming.email, before.email),
    phone: keep(incoming.phone, before.phone),
    dateOfBirth: keep(incoming.dateOfBirth, before.dateOfBirth),
    membershipDate: keep(incoming.membershipDate, before.membershipDate),
    firstVisitOn: keep(incoming.firstVisitOn, before.firstVisitOn),
    lifecycleStatus: incoming.lifecycleStatus,
    householdId: incoming.householdName ? null : before.householdId,
    householdName: incoming.householdName ?? null,
    householdRole: incoming.householdRole ?? before.householdRole,
  };
}

/**
 * R2.3. The tags a row carries, applied to the person.
 *
 * Adding only. A file that does not mention a tag is a file that does not
 * mention it, and reading that as "take it off" loses what the church put on by
 * hand.
 */
async function writeTags(
  db: Tx,
  actor: { tenantId: string; role: TenantRole; userId?: string },
  memberId: string,
  names: string[],
): Promise<void> {
  for (const name of names) {
    const tag = await ensureTag(db, actor, name);
    if (tag) await setPersonTag(db, actor, memberId, tag.id, true);
  }
}

async function writeCustom(
  db: Tx,
  actor: { tenantId: string; role: TenantRole },
  memberId: string,
  values: Record<string, unknown>,
): Promise<void> {
  if (Object.keys(values).length === 0) return;
  await setCustomValues(db, actor, "person", memberId, values as never);
}

async function record(
  db: Tx,
  actor: { tenantId: string },
  batchId: string,
  row: PlannedRow,
  memberId: string | null,
  before: unknown,
): Promise<void> {
  await db.insert(importRows).values({
    tenantId: actor.tenantId,
    batchId,
    lineNumber: row.lineNumber,
    outcome: row.outcome,
    memberId,
    reason: row.reason ?? null,
    before: before ?? null,
    source: row.source,
  });
}
