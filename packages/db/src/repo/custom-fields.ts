import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { customFields, customFieldValues } from "../schema/custom-fields";
import { canEditPeople, PermissionError, type TenantRole } from "../roles";
import { can, rolesWith, type Who } from "../permissions";
import { InvalidInputError, NameTakenError } from "../errors";
import type { WriteActor } from "./members";

/**
 * R1.12. Custom fields, so a church never has to ask us for a column.
 *
 * Every church keeps something nobody else keeps. A dietary note, a parking
 * permit number, which service someone usually attends. The alternative to this
 * is that it goes in the notes field as prose, where nothing can filter on it.
 */

export const CUSTOM_FIELD_ENTITIES = ["person", "household", "group", "event", "donation"] as const;
export type CustomFieldEntity = (typeof CUSTOM_FIELD_ENTITIES)[number];

/**
 * `file` is in the database enum and is deliberately not offered yet. It needs
 * per-tenant storage quotas to exist first (R1.16), and a field type that can
 * silently fill a church's storage is worse than no field type.
 */
export const CUSTOM_FIELD_TYPES = ["text", "number", "date", "select", "multi_select", "boolean"] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export interface CustomFieldDef {
  id: string;
  entity: string;
  key: string;
  label: string;
  type: string;
  options: string[] | null;
  /** R17.1. Whether the person may change it on their own profile. */
  memberEditable: boolean;
}

/** A value as the form holds it, before it is shaped for storage. */
export type CustomValue = string | number | boolean | string[] | null;

/**
 * Defining a field changes the shape of every record of that kind, so it stays
 * with Owner and Admin. Filling one in is ordinary editing.
 */
export const CAN_MANAGE_CUSTOM_FIELDS: readonly TenantRole[] = rolesWith("church.fields");
export const canManageCustomFields = (role: Who): boolean =>
  can(role, "church.fields");

/** "Allergy notes" becomes "allergy_notes". Stable, so exports have a sane header. */
export function keyFor(label: string): string {
  const base = label
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "field";
}

export async function listCustomFields(db: Tx, entity: CustomFieldEntity): Promise<CustomFieldDef[]> {
  return db
    .select({
      id: customFields.id,
      entity: customFields.entity,
      key: customFields.key,
      label: customFields.label,
      type: customFields.type,
      options: customFields.options,
      memberEditable: customFields.memberEditable,
    })
    .from(customFields)
    .where(eq(customFields.entity, entity))
    .orderBy(asc(customFields.createdAt));
}

function cleanOptions(type: CustomFieldType, raw: string[] | undefined | null): string[] | null {
  if (type !== "select" && type !== "multi_select") return null;
  const list = (raw ?? []).map((o) => o.trim()).filter(Boolean);
  const seen = new Set<string>();
  const unique = list.filter((o) => {
    const k = o.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (unique.length === 0) throw new InvalidInputError("error.fieldNoChoices");
  return unique;
}

export async function createCustomField(
  db: Tx,
  actor: WriteActor,
  input: {
    entity: CustomFieldEntity; label: string; type: CustomFieldType;
    options?: string[]; memberEditable?: boolean;
  },
): Promise<CustomFieldDef> {
  if (!canManageCustomFields(actor)) throw new PermissionError(actor.role, "addField");

  const label = input.label.trim().replace(/\s+/g, " ");
  if (!label) throw new InvalidInputError("error.fieldNameBlank");

  const clash = await db
    .select({ id: customFields.id })
    .from(customFields)
    .where(and(eq(customFields.entity, input.entity), sql`lower(${customFields.label}) = lower(${label})`))
    .limit(1);
  if (clash[0]) throw new NameTakenError("error.nameTaken.field", label, clash[0].id);

  // The key is derived but must stay unique, because exports and the import
  // wizard address a field by key rather than by label.
  const taken = new Set(
    (
      await db
        .select({ key: customFields.key })
        .from(customFields)
        .where(eq(customFields.entity, input.entity))
    ).map((r) => r.key),
  );
  let key = keyFor(label);
  for (let n = 2; taken.has(key); n++) key = `${keyFor(label)}_${n}`;

  const [row] = await db
    .insert(customFields)
    .values({
      tenantId: actor.tenantId,
      entity: input.entity,
      key,
      label,
      type: input.type,
      options: cleanOptions(input.type, input.options),
      memberEditable: input.memberEditable ?? false,
    })
    .returning({
      id: customFields.id,
      entity: customFields.entity,
      key: customFields.key,
      label: customFields.label,
      type: customFields.type,
      options: customFields.options,
      memberEditable: customFields.memberEditable,
    });

  if (!row) throw new Error("Field insert returned no row.");
  return row;
}

/**
 * Renames a field and edits its choices. The type never changes.
 *
 * Changing a field from a date to a number would leave every value already
 * recorded unreadable, with no honest way to convert them. Deleting and
 * recreating is the same operation, except it is obvious what it costs.
 */
export async function updateCustomField(
  db: Tx,
  actor: WriteActor,
  id: string,
  input: { label: string; options?: string[]; type?: CustomFieldType; memberEditable?: boolean },
): Promise<void> {
  if (!canManageCustomFields(actor)) throw new PermissionError(actor.role, "editField");

  const label = input.label.trim().replace(/\s+/g, " ");
  if (!label) throw new InvalidInputError("error.fieldNameBlank");

  const [current] = await db
    .select({ entity: customFields.entity, type: customFields.type })
    .from(customFields)
    .where(eq(customFields.id, id))
    .limit(1);
  if (!current) throw new Error("No such field.");

  const clash = await db
    .select({ id: customFields.id })
    .from(customFields)
    .where(
      and(
        eq(customFields.entity, current.entity),
        sql`lower(${customFields.label}) = lower(${label})`,
        sql`${customFields.id} <> ${id}::uuid`,
      ),
    )
    .limit(1);
  if (clash[0]) throw new NameTakenError("error.nameTaken.field", label, clash[0].id);

  /*
   * R1.10. The shape of a field's answer can change while nothing has been
   * answered. Once a church has recorded values against it, it cannot: a date
   * written into a field that is now a list of choices is a value nobody can
   * read back, and we do not silently throw a church's data away.
   */
  let type = current.type as CustomFieldType;
  if (input.type && input.type !== type) {
    const [recorded] = await db
      .select({ id: customFieldValues.id })
      .from(customFieldValues)
      .where(eq(customFieldValues.fieldId, id))
      .limit(1);
    if (recorded) throw new InvalidInputError("error.fieldTypeInUse");
    type = input.type;
  }

  await db
    .update(customFields)
    .set({
      label,
      type,
      options: cleanOptions(type, input.options),
      ...(input.memberEditable === undefined ? {} : { memberEditable: input.memberEditable }),
    })
    .where(eq(customFields.id, id));
}

/** Removes the field and every value recorded against it. Confirmed in the UI. */
export async function deleteCustomField(
  db: Tx,
  actor: WriteActor,
  id: string,
): Promise<{ valuesRemoved: number }> {
  if (!canManageCustomFields(actor)) throw new PermissionError(actor.role, "deleteField");

  const values = await db
    .select({ id: customFieldValues.id })
    .from(customFieldValues)
    .where(eq(customFieldValues.fieldId, id));

  const changed = await db.delete(customFields).where(eq(customFields.id, id)).returning({ id: customFields.id });
  if (changed.length === 0) throw new Error("No such field.");

  return { valuesRemoved: values.length };
}

/**
 * Shapes and checks one value against its field.
 *
 * Returns the value to store, or a message. A blank of any kind is null, which
 * is stored as no row at all, so "never answered" and "answered with nothing"
 * do not become two different states.
 */
export function coerceCustomValue(
  field: CustomFieldDef,
  raw: CustomValue,
): { value: CustomValue } | { error: string } {
  const empty = raw === null || raw === undefined || raw === "" || (Array.isArray(raw) && raw.length === 0);

  switch (field.type) {
    case "boolean":
      return { value: raw === true || raw === "true" || raw === "1" };

    case "number": {
      if (empty) return { value: null };
      const n = typeof raw === "number" ? raw : Number(String(raw).trim());
      if (!Number.isFinite(n)) return { error: `${field.label} takes a number.` };
      return { value: n };
    }

    case "date": {
      if (empty) return { value: null };
      const s = String(raw).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) {
        return { error: `Check ${field.label}. Use the date picker or type it as YYYY-MM-DD.` };
      }
      return { value: s };
    }

    case "select": {
      if (empty) return { value: null };
      const s = String(raw);
      if (!(field.options ?? []).includes(s)) return { error: `Choose one of the options for ${field.label}.` };
      return { value: s };
    }

    case "multi_select": {
      if (empty) return { value: null };
      const list = Array.isArray(raw) ? raw.map(String) : [String(raw)];
      const allowed = field.options ?? [];
      if (list.some((v) => !allowed.includes(v))) {
        return { error: `Choose from the options for ${field.label}.` };
      }
      return { value: list };
    }

    default: {
      if (empty) return { value: null };
      return { value: String(raw).trim() };
    }
  }
}

/** Every recorded value for one record, keyed by field id. */
export async function getCustomValues(
  db: Tx,
  entity: CustomFieldEntity,
  entityId: string,
): Promise<Record<string, CustomValue>> {
  const rows = await db
    .select({ fieldId: customFieldValues.fieldId, value: customFieldValues.value })
    .from(customFieldValues)
    .innerJoin(customFields, eq(customFields.id, customFieldValues.fieldId))
    .where(and(eq(customFieldValues.entityId, entityId), eq(customFields.entity, entity)));

  return Object.fromEntries(rows.map((r) => [r.fieldId, r.value as CustomValue]));
}

/**
 * Writes the values for one record.
 *
 * Only fields present in the map are touched, so a form that renders a subset
 * cannot wipe what it did not show. A null clears the field by removing the row.
 */
/**
 * R1.10, R17.1. A person setting their own custom fields on their own record.
 *
 * It cannot go through setCustomValues, which asks for "members.edit": a
 * member has no business editing anybody's record including, as far as that
 * permission is concerned, their own. The two guards here are different and
 * narrower. The record has to be the one this account is attached to, and
 * only a field the church marked as the member's to change is written, so a
 * church that keeps a safeguarding note in a custom field keeps it.
 */
export async function setOwnCustomValues(
  db: Tx,
  tenantId: string,
  memberId: string,
  values: Record<string, CustomValue>,
): Promise<void> {
  const ids = Object.keys(values);
  if (ids.length === 0) return;

  const theirs = await db
    .select({ id: customFields.id })
    .from(customFields)
    .where(
      and(
        eq(customFields.entity, "person"),
        eq(customFields.memberEditable, true),
        inArray(customFields.id, ids),
      ),
    );

  const allowed = new Set(theirs.map((one) => one.id));
  const mine = Object.fromEntries(
    Object.entries(values).filter(([id]) => allowed.has(id)),
  );
  if (Object.keys(mine).length === 0) return;

  await writeValues(db, tenantId, memberId, mine);
}

export async function setCustomValues(
  db: Tx,
  actor: WriteActor,
  entity: CustomFieldEntity,
  entityId: string,
  values: Record<string, CustomValue>,
): Promise<void> {
  if (!canEditPeople(actor)) throw new PermissionError(actor.role, "setFieldValue");

  const ids = Object.keys(values);
  if (ids.length === 0) return;

  const fields = await db
    .select({ id: customFields.id })
    .from(customFields)
    .where(and(eq(customFields.entity, entity), inArray(customFields.id, ids)));

  // A field id from another church is simply not in this church's list, so
  // it is ignored rather than reported. There is nothing to tell the user.
  const known = new Set(fields.map((f) => f.id));
  const mine = Object.fromEntries(
    Object.entries(values).filter(([id]) => known.has(id)),
  );

  await writeValues(db, actor.tenantId, entityId, mine);
}

/**
 * The write itself, once somebody has decided which fields may be written.
 *
 * Both ways in share it, so the church's form and the member's own profile
 * cannot drift apart about what a blank means or how a value is stored.
 */
async function writeValues(
  db: Tx,
  tenantId: string,
  entityId: string,
  values: Record<string, CustomValue>,
): Promise<void> {
  const clear: string[] = [];

  for (const [fieldId, value] of Object.entries(values)) {
    if (value === null) {
      clear.push(fieldId);
      continue;
    }

    await db.execute(sql`
      insert into custom_field_values (tenant_id, field_id, entity_id, value)
      values (${tenantId}::uuid, ${fieldId}::uuid, ${entityId}::uuid, ${JSON.stringify(value)}::jsonb)
      on conflict (field_id, entity_id) do update set value = excluded.value`);
  }

  if (clear.length > 0) {
    await db
      .delete(customFieldValues)
      .where(and(eq(customFieldValues.entityId, entityId), inArray(customFieldValues.fieldId, clear)));
  }
}
