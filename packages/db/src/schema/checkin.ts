import { pgTable, uuid, text, integer, timestamp, boolean, date, index, uniqueIndex } from "drizzle-orm/pg-core";
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
    /** "desk", a volunteer drives it, or "kiosk", a family does. */
    mode: text("mode").notNull().default("desk"),
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
    /**
     * R8.17. "child" or "adult", which is what the row is rather than what the
     * person is. An adult with a room is serving in it, and the two-adult rule
     * counts those. Stored rather than worked out from a date of birth, because
     * a church that holds no date of birth for a volunteer still has to be able
     * to count them.
     */
    kind: text("kind").notNull().default("child"),
    /**
     * R8.12. A third label, for the bag or the stroller that came with them.
     *
     * Kept on the visit rather than decided when printing, so a reprint at
     * 11:20 prints what was printed at 09:58, and a station that was offline
     * prints the same thing when it reconciles.
     */
    bagLabel: boolean("bag_label").notNull().default(false),
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
    index("visit_room_idx").on(t.tenantId, t.roomId),
    // One live visit per person per service. Checking a child in twice is the
    // same child, and two rows would be two codes for one label pair.
    uniqueIndex("visit_unique").on(t.occurrenceId, t.personId),
    // R8.6. A code is a church's own and is never handed out twice, which is
    // stronger than the twelve months the requirement asks for and simpler to
    // be sure of. The database is what enforces it, rather than a check that
    // two stations could both pass at the same moment.
    uniqueIndex("visit_code_unique").on(t.tenantId, t.code),
  ],
);

/**
 * R8.7 to R8.9. A decision somebody made to release a child anyway.
 *
 * Every rule at checkout can be passed, because a real Sunday produces cases no
 * rule anticipated: a grandmother nobody got round to adding, a code on a label
 * that went through the wash. What cannot happen is passing one quietly. This
 * row is the record that a person decided, which child it was about, what they
 * were passing, and why.
 *
 * Append only. Nothing in the application edits or deletes one, including an
 * Owner, which is the same rule the audit log runs under.
 */
export const checkinOverrides = pgTable(
  "checkin_overrides",
  {
    id: pk(),
    tenantId: tenantId(),
    visitId: uuid("visit_id").notNull().references(() => checkinVisits.id, { onDelete: "cascade" }),
    /** "code", "pickup" or "restriction". What was passed. */
    reasonKind: text("reason_kind").notNull(),
    /** What the person typed. Required, because "why" is the point of the row. */
    reason: text("reason").notNull(),
    /** The signed-in user who authorised it. */
    authorisedBy: uuid("authorised_by"),
    /** Who collected the child, where the church holds a record of them. */
    collectedBy: uuid("collected_by").references(() => people.id, { onDelete: "set null" }),
    createdAt: created(),
  },
  (t) => [
    index("override_tenant_idx").on(t.tenantId),
    index("override_visit_idx").on(t.tenantId, t.visitId),
  ],
);

/**
 * R8.21. Codes a station holds before it needs them.
 *
 * A station with no network still has to put a unique code on a label pair, and
 * uniqueness is a property of the whole church, so it cannot be worked out by a
 * tablet on its own. The station is handed a block of codes while the network
 * is up, and every code in that block is already spoken for: no other station
 * can be given it, and the online path will not generate it either.
 *
 * Reservations outlive the service deliberately. A tablet that was switched off
 * before it reconciled still has unsent check-ins on it, and those codes are on
 * labels in a parent's pocket.
 */
export const checkinCodes = pgTable(
  "checkin_codes",
  {
    id: pk(),
    tenantId: tenantId(),
    occurrenceId: uuid("occurrence_id").notNull().references(() => serviceOccurrences.id, { onDelete: "cascade" }),
    stationId: uuid("station_id").notNull().references(() => checkinStations.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    /** Set when a visit takes it, so a block can be topped up honestly. */
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: created(),
  },
  (t) => [
    index("code_tenant_idx").on(t.tenantId),
    index("code_block_idx").on(t.tenantId, t.stationId, t.occurrenceId),
    uniqueIndex("code_unique").on(t.tenantId, t.code),
  ],
);

/**
 * R8.23. What a station did while it was on its own.
 *
 * Every offline action carries an id the station made up before it happened, and
 * that id is what makes replaying twice safe: a tablet that sends its log, loses
 * the wifi again before it hears back, and sends the same log on reconnect must
 * not check forty children in twice.
 *
 * The outcome is kept rather than discarded, because "applied" and "the child
 * was already in another room" are both things somebody may have to explain on
 * a Monday.
 */
export const checkinOfflineEvents = pgTable(
  "checkin_offline_events",
  {
    id: pk(),
    tenantId: tenantId(),
    stationId: uuid("station_id").notNull().references(() => checkinStations.id, { onDelete: "cascade" }),
    /** The id the station gave it, before it had a network to ask. */
    eventId: uuid("event_id").notNull(),
    /** "checkin" or "checkout". */
    kind: text("kind").notNull(),
    /** When it happened at the station, which is not when it arrived here. */
    happenedAt: timestamp("happened_at", { withTimezone: true }).notNull(),
    /** "applied", or the name of what stopped it. */
    outcome: text("outcome").notNull(),
    createdAt: created(),
  },
  (t) => [
    index("offline_event_tenant_idx").on(t.tenantId),
    index("offline_event_station_idx").on(t.tenantId, t.stationId),
    uniqueIndex("offline_event_unique").on(t.tenantId, t.eventId),
  ],
);

/**
 * R8.13. An incident report.
 *
 * Something happened to a child in a class: a bump on the head, a bite, a child
 * who could not be settled, a near miss at a door. The church writes it down at
 * the time, in the room, and it is kept.
 *
 * Append only and permanently retained. There is no edit and no delete, not for
 * an Owner either, for the same reason the audit log has none: a record that can
 * be tidied up afterwards is worth nothing on the day somebody asks what
 * happened. The one field that changes is whether the guardian has been told,
 * because telling them usually happens after the report is written, and the
 * moment it is set is kept with it.
 *
 * Reading is restricted to the roles that handle safeguarding. Writing is not:
 * the volunteer who saw it has to be able to file it from the station.
 */
export const incidentReports = pgTable(
  "incident_reports",
  {
    id: pk(),
    tenantId: tenantId(),
    /** The child it happened to. */
    personId: uuid("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    /** The class they were in, where they were in one. */
    roomId: uuid("room_id").references(() => checkinRooms.id, { onDelete: "set null" }),
    /** The service it happened at, where it was during one. */
    occurrenceId: uuid("occurrence_id").references(() => serviceOccurrences.id, { onDelete: "set null" }),
    /** The day it happened, which is not always the day it was written. */
    occurredOn: date("occurred_on").notNull(),
    /**
     * Who was in the room. Free text until serving is built (F10), because a
     * church that cannot name the people present at all writes nothing down.
     */
    volunteers: text("volunteers").notNull().default(""),
    /** What happened, in the words of whoever saw it. */
    description: text("description").notNull(),
    /** What was done about it. */
    action: text("action").notNull(),
    /** R8.13. Whether the guardian was told, and when. */
    guardianNotified: boolean("guardian_notified").notNull().default(false),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    notifiedBy: uuid("notified_by"),
    /** Who wrote it. */
    reportedBy: uuid("reported_by"),
    createdAt: created(),
  },
  (t) => [
    index("incident_tenant_idx").on(t.tenantId, t.occurredOn),
    index("incident_person_idx").on(t.tenantId, t.personId),
    index("incident_room_idx").on(t.tenantId, t.roomId),
  ],
);
