import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { customFields, customFieldValues } from "../schema/custom-fields";
import { canEditPeople, PermissionError, type TenantRole } from "../roles";
import { InvalidInputError, NameTakenError } from "../errors";
import type { WriteActor } from "./people";

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
}

/** A value as the form holds it, before it is shaped for storage. */
export type CustomValue = string | number | boolean | string[] | null;

/**
 * Defining a field changes the shape of every record of that kind, so it stays
 * with Owner and Admin. Filling one in is ordinary editing.
 */
export const CAN_MANAGE_CUSTOM_FIELDS: readonly TenantRole[] = ["owner", "admin"];
export const canManageCustomFields = (role: TenantRole): boolean =>
  CAN_MANAGE_CUSTOM_FIELDS.includes(role);

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
  if (unique.length === 0) throw new InvalidInputError("A choice field needs at least one choice.");
  return unique;
}

export async function createCustomField(
  db: Tx,
  actor: WriteActor,
  input: { entity: CustomFieldEntity; label: string; type: CustomFieldType; options?: string[] },
): Promise<CustomFieldDef> {
  if (!canManageCustomFields(actor.role)) throw new PermissionError(actor.role, "add a field");

  const label = input.label.trim().replace(/\s+/g, " ");
  if (!label) throw new InvalidInputError("Enter a name for the field.");

  const clash = await db
    .select({ id: customFields.id })
    .from(customFields)
    .where(and(eq(customFields.entity, input.entity), sql`lower(${customFields.label}) = lower(${label})`))
    .limit(1);
  if (clash[0]) throw new NameTakenError(`a field called "${label}"`, clash[0].id);

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
    })
    .returning({
      id: customFields.id,
      entity: customFields.entity,
      key: customFields.key,
      label: customFields.label,
      type: customFields.type,
      options: customFields.options,
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
  input: { label: string; options?: string[] },
): Promise<void> {
  if (!canManageCustomFields(actor.role)) throw new PermissionError(actor.role, "edit a field");

  const label = input.label.trim().replace(/\s+/g, " ");
  if (!label) throw new InvalidInputError("Enter a name for the field.");

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
  if (clash[0]) throw new NameTakenError(`a field called "${label}"`, clash[0].id);

  await db
    .update(customFields)
    .set({ label, options: cleanOptions(current.type as CustomFieldType, input.options) })
    .where(eq(customFields.id, id));
}

/** Removes the field and every value recorded against it. Confirmed in the UI. */
export async function deleteCustomField(
  db: Tx,
  actor: WriteActor,
  id: string,
): Promise<{ valuesRemoved: number }> {
  if (!canManageCustomFields(actor.role)) throw new PermissionError(actor.role, "delete a field");

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
export async function setCustomValues(
  db: Tx,
  actor: WriteActor,
  entity: CustomFieldEntity,
  entityId: string,
  values: Record<string, CustomValue>,
): Promise<void> {
  if (!canEditPeople(actor.role)) throw new PermissionError(actor.role, "change a field value");

  const ids = Object.keys(values);
  if (ids.length === 0) return;

  const fields = await db
    .select({ id: customFields.id })
    .from(customFields)
    .where(and(eq(customFields.entity, entity), inArray(customFields.id, ids)));

  const known = new Set(fields.map((f) => f.id));
  const clear: string[] = [];

  for (const [fieldId, value] of Object.entries(values)) {
    // A field id from another church is simply not in this church's list, so it
    // is ignored rather than reported. There is nothing to tell the user.
    if (!known.has(fieldId)) continue;

    if (value === null) {
      clear.push(fieldId);
      continue;
    }

    await db.execute(sql`
      insert into custom_field_values (tenant_id, field_id, entity_id, value)
      values (${actor.tenantId}::uuid, ${fieldId}::uuid, ${entityId}::uuid, ${JSON.stringify(value)}::jsonb)
      on conflict (field_id, entity_id) do update set value = excluded.value`);
  }

  if (clear.length > 0) {
    await db
      .delete(customFieldValues)
      .where(and(eq(customFieldValues.entityId, entityId), inArray(customFieldValues.fieldId, clear)));
  }
}
