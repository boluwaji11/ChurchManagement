import { pgTable, uuid, text, date, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { tenants, campuses, serviceTimes } from "./tenancy";

const pk = () => uuid("id").primaryKey().defaultRandom();
const tenantId = () => uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" });
const created = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updated = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/**
 * R7.1. One gathering that happened, or is going to.
 *
 * Generated from the church's service times, and editable afterwards, because
 * the generated calendar is a starting point rather than the truth. Christmas
 * Eve is not on the list. The Sunday it snowed is on the list and did not
 * happen. Both have to be sayable.
 *
 * A special service has no service_time_id: it belongs to no weekly pattern and
 * regenerating the calendar must never touch it.
 */
export const serviceOccurrences = pgTable(
  "service_occurrences",
  {
    id: pk(),
    tenantId: tenantId(),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
    /** Null for a one-off. Set for anything generated from the weekly pattern. */
    serviceTimeId: uuid("service_time_id").references(() => serviceTimes.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    occursOn: date("occurs_on").notNull(),
    /** Local to the church's timezone, as HH:MM. */
    startsAt: text("starts_at").notNull(),
    /** "scheduled" or "cancelled". Cancelled occurrences stay, so a gap in the
     *  attendance record is explained rather than blank. */
    status: text("status").notNull().default("scheduled"),
    /** R7.8. Weather, a holiday, anything that explains a number. */
    note: text("note"),
    /** R7.2. Headcounts, when a church only ever counts heads. */
    countAdults: integer("count_adults"),
    countChildren: integer("count_children"),
    countVisitors: integer("count_visitors"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("occ_tenant_idx").on(t.tenantId),
    index("occ_date_idx").on(t.tenantId, t.occursOn),
    // One occurrence per service time per day. A special service has no service
    // time, and Postgres treats those nulls as distinct, which is what we want:
    // a church can hold two carol services on the same evening.
    uniqueIndex("occ_unique").on(t.tenantId, t.serviceTimeId, t.occursOn),
  ],
);
