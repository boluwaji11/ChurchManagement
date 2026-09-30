import { pgTable, uuid, text, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { tenants, campuses } from "./tenancy";

const pk = () => uuid("id").primaryKey().defaultRandom();
const tenantId = () => uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" });
const created = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updated = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/**
 * R8.14 to R8.17. A room children are checked into.
 *
 * The age range is held in months, because the difference between a nursery
 * that takes babies to a year old and one that takes them to eighteen months is
 * the whole of that room's staffing. Years cannot say it.
 *
 * Capacity and ratio are what the room can safely hold and how many volunteers
 * it needs. Both are the church's own numbers, and the station reads them at
 * the moment a child is checked in: at capacity it warns, above it blocks, and
 * below the ratio it says so. (R8.15, R8.16)
 *
 * The hue is not decoration. It prints on the child's label and on the
 * guardian's, so a volunteer can send a parent to the right door by colour
 * across a crowded foyer.
 *
 * Archived rather than deleted, because a room that closes still has a year of
 * attendance and incident records pointing at it.
 */
export const checkinRooms = pgTable(
  "checkin_rooms",
  {
    id: pk(),
    tenantId: tenantId(),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    /** One of the twelve hues. Printed on the label. */
    hue: text("hue").notNull().default("sky"),
    /** Inclusive, in months. Null means no floor. */
    minAgeMonths: integer("min_age_months"),
    /** Exclusive, in months, so 0 to 24 and 24 to 48 tile with no gap and no
     *  overlap. Null means no ceiling. */
    maxAgeMonths: integer("max_age_months"),
    /** How many children the room holds. Null means the church has not said. */
    capacity: integer("capacity"),
    /** One volunteer per this many children. Null means the church has not said. */
    ratio: integer("ratio"),
    /** Where it sits in the list the station shows. */
    position: integer("position").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("room_tenant_idx").on(t.tenantId),
    index("room_age_idx").on(t.tenantId, t.minAgeMonths, t.maxAgeMonths),
    uniqueIndex("room_name_unique").on(t.tenantId, t.name),
  ],
);
