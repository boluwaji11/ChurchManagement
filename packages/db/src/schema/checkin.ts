import { pgTable, uuid, text, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { tenants, campuses, serviceTimes } from "./tenancy";
import { serviceOccurrences } from "./gatherings";
import { people } from "./people";

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

/**
 * R8.1, R8.2. A station: one device set up to check people in.
 *
 * The configuration is the station's rather than the device's, so a church that
 * replaces a broken tablet on a Sunday morning points the new one at the same
 * station and carries on. The device remembers which station it is; everything
 * about what that station may do lives here, where an administrator can change
 * it without standing at the device.
 *
 * Four modes, because the same church runs different things in different
 * corners: a kiosk a family drives itself, a manned desk a volunteer drives, a
 * tablet carried around the foyer, and the household's own phone before they
 * leave the house. The last one is not a device we configure, which is why it
 * is a mode here rather than a separate feature: it needs the same answers
 * about which rooms and which services it may touch.
 */
export const checkinStations = pgTable(
  "checkin_stations",
  {
    id: pk(),
    tenantId: tenantId(),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    /** "kiosk", "manned", "roaming" or "phone". */
    mode: text("mode").notNull().default("manned"),
    /** "brother", "dymo" or "paper". */
    printer: text("printer").notNull().default("paper"),
    /** When a device last identified itself as this station. */
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("station_tenant_idx").on(t.tenantId),
    uniqueIndex("station_name_unique").on(t.tenantId, t.name),
  ],
);

/**
 * Which rooms a station may check into. No rows means every room, which is what
 * a single-desk church wants and never has to think about.
 */
export const checkinStationRooms = pgTable(
  "checkin_station_rooms",
  {
    id: pk(),
    tenantId: tenantId(),
    stationId: uuid("station_id").notNull().references(() => checkinStations.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").notNull().references(() => checkinRooms.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("station_room_tenant_idx").on(t.tenantId),
    uniqueIndex("station_room_unique").on(t.stationId, t.roomId),
  ],
);

/**
 * Which services a station covers, by the repeat they come from. No rows means
 * every service.
 */
export const checkinStationServices = pgTable(
  "checkin_station_services",
  {
    id: pk(),
    tenantId: tenantId(),
    stationId: uuid("station_id").notNull().references(() => checkinStations.id, { onDelete: "cascade" }),
    serviceTimeId: uuid("service_time_id").notNull().references(() => serviceTimes.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("station_service_tenant_idx").on(t.tenantId),
    uniqueIndex("station_service_unique").on(t.stationId, t.serviceTimeId),
  ],
);

/**
 * R8.4, R8.6. One person, checked in to one room, at one service.
 *
 * The row a volunteer creates when a family reaches the desk, and the row a
 * checkout has to find before anybody is released. A visit carries its own
 * security code, which is what the guardian's label shows and what is asked for
 * at pickup.
 *
 * The code is nullable only because it arrives with the labels in HRT-57.
 * Checkout refuses a visit without one: a child is never released on anything
 * weaker than the code or a recorded override.
 */
export const checkinVisits = pgTable(
  "checkin_visits",
  {
    id: pk(),
    tenantId: tenantId(),
    occurrenceId: uuid("occurrence_id").notNull().references(() => serviceOccurrences.id, { onDelete: "cascade" }),
    personId: uuid("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    /** Null for an adult taking a name badge rather than a room. (R8.5) */
    roomId: uuid("room_id").references(() => checkinRooms.id, { onDelete: "set null" }),
    stationId: uuid("station_id").references(() => checkinStations.id, { onDelete: "set null" }),
    /** R8.6. Unique within a service occurrence, and not reused for 12 months. */
    code: text("code"),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }).defaultNow().notNull(),
    /** Who did the checking in, where a volunteer was driving the station. */
    checkedInBy: uuid("checked_in_by"),
    checkedOutAt: timestamp("checked_out_at", { withTimezone: true }),
    /** The person who collected them, where the church holds a record of them. */
    checkedOutTo: uuid("checked_out_to").references(() => people.id, { onDelete: "set null" }),
    createdAt: created(),
  },
  (t) => [
    index("visit_tenant_idx").on(t.tenantId),
    index("visit_occurrence_idx").on(t.tenantId, t.occurrenceId),
    index("visit_person_idx").on(t.tenantId, t.personId),
    // One live visit per person per service. Checking a child in twice is the
    // same child, and two rows would be two codes for one label pair.
    uniqueIndex("visit_unique").on(t.occurrenceId, t.personId),
  ],
);
