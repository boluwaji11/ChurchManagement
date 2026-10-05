import { pgTable, uuid, text, date, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { tenants, campuses, serviceTimes } from "./tenancy";
import { members } from "./members";

const pk = () => uuid("id").primaryKey().defaultRandom();
const tenantId = () => uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" });
const created = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updated = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/**
 * R7.1. One service that happened, or is going to.
 *
 * Generated from the church's service times, and editable afterwards, because
 * the generated calendar is a starting point rather than the truth. Christmas
 * Eve is not on the list. The service it snowed on is on the list and did not
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
    /** R24.6. The readable part of its address: the date, then its name. */
    slug: text("slug").notNull(),
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

/**
 * R7.3. One person, at one service.
 *
 * A row means present. There is no absent row, because absence is the lack of a
 * record rather than a fact somebody asserts, and a table holding a row per
 * person per service for everyone who did not come is a table nobody can read.
 * R7.6 derives absence from the gaps.
 */
export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: pk(),
    tenantId: tenantId(),
    occurrenceId: uuid("occurrence_id").notNull().references(() => serviceOccurrences.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    /** How it was recorded: "roster", "checkin", "import". */
    source: text("source").notNull().default("roster"),
    createdAt: created(),
  },
  (t) => [
    index("att_tenant_idx").on(t.tenantId),
    index("att_occurrence_idx").on(t.tenantId, t.occurrenceId),
    index("att_person_idx").on(t.tenantId, t.memberId),
    uniqueIndex("att_unique").on(t.occurrenceId, t.memberId),
  ],
);
