import { pgTable, uuid, text, integer, boolean, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { tenants, appUsers } from "./tenancy";
import { importStatus, importOutcome } from "./enums";

/**
 * R19.1 to R19.4. An import is a recorded event, not a script somebody ran.
 *
 * Every row that went in is kept, with what it did and what the record looked
 * like before, because R19.4 says a completed import can be rolled back as one
 * operation for thirty days. A church that imports a spreadsheet with the columns
 * shifted by one needs a way out that is not a support ticket, and "restore the
 * whole database" is not an answer when the mistake was at 9pm on a Saturday.
 */
export const importBatches = pgTable(
  "import_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    /**
     * R19.5. "people" or "groups". A group file's rows are memberships rather
     * than people, so the preview, the counts and the rollback all read it
     * differently.
     */
    kind: text("kind").notNull().default("people"),
    status: importStatus("status").notNull().default("preview"),
    /** The header-to-field mapping used, kept so it can be offered again (R19.1). */
    mapping: jsonb("mapping").$type<Record<string, string>>(),
    duplicateStrategy: text("duplicate_strategy").notNull().default("skip"),
    rowsTotal: integer("rows_total").notNull().default(0),
    rowsCreated: integer("rows_created").notNull().default(0),
    rowsUpdated: integer("rows_updated").notNull().default(0),
    rowsSkipped: integer("rows_skipped").notNull().default(0),
    rowsFailed: integer("rows_failed").notNull().default(0),
    startedByUserId: uuid("started_by_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    committedAt: timestamp("committed_at", { withTimezone: true }),
    rolledBackAt: timestamp("rolled_back_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("import_batches_tenant_idx").on(t.tenantId, t.createdAt)],
);

/**
 * One row of the file, and what became of it.
 *
 * `before` holds the record as it was for an update, which is what makes a
 * rollback a restore rather than a guess. A created person is removed on
 * rollback; an updated one is put back.
 */
export const importRows = pgTable(
  "import_rows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id").notNull().references(() => importBatches.id, { onDelete: "cascade" }),
    lineNumber: integer("line_number").notNull(),
    outcome: importOutcome("outcome").notNull(),
    personId: uuid("person_id"),
    /** R19.5. The group a membership row put that person into. */
    groupId: uuid("group_id"),
    /** R19.5. True on the row that brought a group into existence. */
    groupCreated: boolean("group_created").notNull().default(false),
    /** Why a row was skipped or failed, as a message key with its values. */
    reason: text("reason"),
    before: jsonb("before"),
    source: jsonb("source").$type<Record<string, string>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("import_rows_batch_idx").on(t.batchId, t.lineNumber),
    index("import_rows_tenant_idx").on(t.tenantId),
  ],
);
