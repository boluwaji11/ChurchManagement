import { pgTable, uuid, text, jsonb, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { tenants, appUsers } from "./tenancy";

/**
 * R18.x. A report a church built and kept.
 *
 * What is stored is a spec against the field catalogue in report-spec.ts: which
 * subject, which filters, which columns, what it is counted by. Every key in it
 * is checked against that catalogue on the way in and again on the way out, so
 * a saved report cannot name a field that no longer exists or was never there.
 */
export const savedReports = pgTable(
  "saved_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** R24.6. The readable part of its address, unique within the church. */
    slug: text("slug").notNull(),
    /** "people", "attendance" or "followups". */
    subject: text("subject").notNull(),
    spec: jsonb("spec").notNull().default({}),
    createdByUserId: uuid("created_by_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    /** R2.13. Archive, never hard delete. */
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("saved_reports_tenant_idx").on(t.tenantId),
    uniqueIndex("saved_reports_name_unique").on(t.tenantId, t.name),
  ],
);
