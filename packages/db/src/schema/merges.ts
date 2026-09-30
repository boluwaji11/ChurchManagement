import { pgTable, uuid, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { tenants, appUsers } from "./tenancy";
import { people } from "./people";

/**
 * R2.8. A merge, and everything needed to undo it for thirty days.
 *
 * Two people in a directory are one person more often than anybody expects: a
 * visitor card, then a form, then an import. Merging them is easy. Merging the
 * wrong two is the thing that keeps somebody from ever pressing the button, so
 * the undo is not a nice extra, it is what makes the feature usable.
 *
 * Undo has to be exact rather than approximate, so this records what actually
 * happened: which rows moved, and what the surviving record looked like before
 * the losing record's values were written over it.
 */
export const personMerges = pgTable(
  "person_merges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    /** The record that survives. */
    winnerId: uuid("winner_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    /** The record that is archived. Never deleted, so undo has something to restore. */
    loserId: uuid("loser_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    /** The winner's own fields as they were, so an overwrite can be put back. */
    winnerBefore: jsonb("winner_before"),
    /** Every row re-pointed at the winner, as [{ table, id }], so undo moves back exactly those. */
    movedRows: jsonb("moved_rows").$type<{ table: string; id: string }[]>(),
    mergedByUserId: uuid("merged_by_user_id").references(() => appUsers.id, { onDelete: "set null" }),
    mergedAt: timestamp("merged_at", { withTimezone: true }).defaultNow().notNull(),
    undoneAt: timestamp("undone_at", { withTimezone: true }),
  },
  (t) => [
    index("person_merges_tenant_idx").on(t.tenantId, t.mergedAt),
    index("person_merges_loser_idx").on(t.loserId),
  ],
);
