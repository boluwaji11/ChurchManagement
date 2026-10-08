import {
  pgTable, uuid, text, jsonb, boolean, timestamp, uniqueIndex, index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenancy";
import { customFieldType, customFieldEntity } from "./enums";

/** R1.12. Custom fields on any entity, so a church never asks us for a column. */
export const customFields = pgTable(
  "custom_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    entity: customFieldEntity("entity").notNull(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    type: customFieldType("type").notNull(),
    options: jsonb("options").$type<string[]>(),
    /**
     * R1.10, R17.1. Whether the person may change it on their own profile.
     *
     * Some custom fields are the member's own details and some are the
     * church's notes about them, and only the church knows which is which.
     */
    memberEditable: boolean("member_editable").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("custom_fields_unique").on(t.tenantId, t.entity, t.key)],
);

export const customFieldValues = pgTable(
  "custom_field_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    fieldId: uuid("field_id").notNull().references(() => customFields.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id").notNull(),
    value: jsonb("value"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("cfv_unique").on(t.fieldId, t.entityId),
    index("cfv_tenant_idx").on(t.tenantId),
  ],
);
