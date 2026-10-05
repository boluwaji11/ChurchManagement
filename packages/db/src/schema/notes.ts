import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { tenants, appUsers } from "./tenancy";
import { members } from "./members";
import { noteClassification } from "./enums";

/**
 * R2.7 and R6.2. Two classes in one table with a hard boundary.
 *
 * A confidential note's body is stored encrypted at the application layer with a
 * key the database never sees, so the row can be listed while the content stays
 * unreadable. That is exactly what R6.2 requires: a user without the confidential
 * tier sees that a note exists, its date, and its author, and cannot read its
 * content through the UI, the API, an export, or a report.
 *
 * Every read of a confidential note writes an audit entry.
 */
export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    classification: noteClassification("classification").notNull().default("general"),
    /** Plaintext for general notes. Null for confidential. */
    body: text("body"),
    /** AES-256-GCM payload for confidential notes. Null for general. */
    bodyEncrypted: text("body_encrypted"),
    authorUserId: uuid("author_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("notes_tenant_idx").on(t.tenantId),
    index("notes_person_idx").on(t.tenantId, t.memberId),
    index("notes_class_idx").on(t.tenantId, t.classification),
  ],
);
