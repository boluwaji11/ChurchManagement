import { sql } from "drizzle-orm";
import { pgTable, uuid, text, integer, boolean, date, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { tenants, campuses } from "./tenancy";
import { people } from "./people";

const pk = () => uuid("id").primaryKey().defaultRandom();
const tenantId = () => uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" });
const created = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updated = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/**
 * R9.1. What kinds of group this church runs.
 *
 * Configurable rather than a fixed list, because a church that calls its small
 * groups "life groups" and runs a "prayer chain" should not have to answer to
 * our vocabulary. Five are created with the church and any of them can be
 * renamed, added to, or archived.
 *
 * The hue is the same twelve-colour spectrum the rest of the product assigns to
 * things, so a type reads at a glance in a list of forty groups.
 */
export const groupTypes = pgTable(
  "group_types",
  {
    id: pk(),
    tenantId: tenantId(),
    name: text("name").notNull(),
    /**
     * R9.5. What this kind of group is, in the church's words, shown at the top
     * of its section in the finder. This is where a church says "Life Groups
     * exist to help you grow" and when the next term starts.
     */
    description: text("description"),
    hue: text("hue").notNull().default("sky"),
    position: integer("position").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("group_type_tenant_idx").on(t.tenantId),
    uniqueIndex("group_type_name_unique").on(t.tenantId, t.name),
  ],
);

/**
 * R9.2. A group.
 *
 * The meeting is held as a day of the week and a time rather than a calendar,
 * because that is how a church says it: Tuesdays at seven, in the Hall. A group
 * that does not meet on a pattern leaves the day empty and says so in its own
 * words.
 *
 * `openToJoin` is what the finder reads (R9.5). A closed group is still listed,
 * because a member looking for a group should see that it exists and is full
 * rather than wonder whether the church has one.
 */
export const groups = pgTable(
  "groups",
  {
    id: pk(),
    tenantId: tenantId(),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
    typeId: uuid("type_id").references(() => groupTypes.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    /** What it is for, in the leader's words. Shown in the finder. */
    description: text("description"),
    /** 0 Sunday to 6 Saturday. Null for a group with no weekly pattern. */
    dayOfWeek: integer("day_of_week"),
    /** 24-hour HH:MM, so it sorts and a timezone never gets involved. */
    startsAt: text("starts_at"),
    /** When it finishes, because "7:15 to 8:45" is what people need to know. */
    endsAt: text("ends_at"),
    /** "weekly", "fortnightly", "monthly", or null where it is irregular. */
    frequency: text("frequency"),
    /** Where it meets, as somebody would tell a newcomer: "The Hall", "U-City". */
    location: text("location"),
    /**
     * R9.5. The street address, where the church is willing to publish one.
     * Separate from the location because "The Hall" is what you say and
     * "6350 Delmar Blvd" is what a map needs, and a group meeting in a home
     * often has the first and deliberately not the second.
     */
    address: text("address"),
    /** How many it holds. Null means the church has not said. */
    capacity: integer("capacity"),
    /**
     * R9.2. A picture of the group, in the church bucket.
     *
     * The finder is a wall of cards, and a card with a photograph of eight
     * people round a table says what a paragraph cannot: this is a real group
     * of real people and you would not be the only new one. Null is a working
     * state, and most groups will stay that way.
     */
    photoKey: text("photo_key"),
    /**
     * R9.5. Who the group is for, as a church says it: anyone, men, women,
     * young adults, students, seniors, parents. One field rather than a gender
     * and an age range, because a church writes "Young adults" on the poster
     * and nobody fills in two dropdowns to say it.
     */
    forWhom: text("for_whom"),
    /** R9.5. It meets online, so where it is does not narrow it. */
    online: boolean("online").notNull().default(false),
    /** R9.5. The question every parent asks before they ask anything else. */
    childrenWelcome: boolean("children_welcome").notNull().default(false),
    /** R9.5. Whether the finder offers a join request. */
    openToJoin: boolean("open_to_join").notNull().default(true),
    /** R9.5. Whether members see it in the finder at all. */
    listed: boolean("listed").notNull().default(true),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("group_tenant_idx").on(t.tenantId),
    index("group_type_idx").on(t.tenantId, t.typeId),
    index("group_day_idx").on(t.tenantId, t.dayOfWeek),
    uniqueIndex("group_name_unique").on(t.tenantId, t.name),
  ],
);

/**
 * R9.3, R9.4. Who is in a group, and in what capacity.
 *
 * A leader is a membership with a role rather than a separate table, because a
 * leader is a member of their group and a co-leader is the same thing again.
 * The role is what R9.3 reads when it decides what somebody may see.
 *
 * Leaving is a date rather than a delete. A church that loses the record of who
 * was in a group last year has lost the only evidence of how somebody was
 * discipled.
 */
export const groupMemberships = pgTable(
  "group_memberships",
  {
    id: pk(),
    tenantId: tenantId(),
    groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    personId: uuid("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    /** "leader", "coleader" or "member". */
    role: text("role").notNull().default("member"),
    joinedOn: date("joined_on").notNull(),
    leftOn: date("left_on"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("group_member_tenant_idx").on(t.tenantId),
    index("group_member_group_idx").on(t.tenantId, t.groupId),
    index("group_member_person_idx").on(t.tenantId, t.personId),
    // One live membership a person a group. Somebody who leaves and comes back
    // gets a second row, which is the history worth keeping, so the uniqueness
    // only covers the live one.
    uniqueIndex("group_member_live_unique")
      .on(t.groupId, t.personId)
      .where(sql`${t.leftOn} is null`),
  ],
);

/**
 * R9.7. One meeting of a group.
 *
 * A row a leader creates by opening the group on the day it met. It exists so
 * that "we did not meet this week" is a recorded fact rather than an absence of
 * data: a group with no meeting row and a group that was cancelled look the
 * same in a report otherwise, and only one of them is a problem.
 */
export const groupMeetings = pgTable(
  "group_meetings",
  {
    id: pk(),
    tenantId: tenantId(),
    groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    metOn: date("met_on").notNull(),
    /** R9.7. Marked rather than deleted, because not meeting is information. */
    notHeld: boolean("not_held").notNull().default(false),
    note: text("note"),
    /** The leader who recorded it. */
    recordedBy: uuid("recorded_by"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("group_meeting_tenant_idx").on(t.tenantId, t.metOn),
    index("group_meeting_group_idx").on(t.tenantId, t.groupId),
    uniqueIndex("group_meeting_unique").on(t.groupId, t.metOn),
  ],
);

/**
 * R9.7, R7.4. Who was at a meeting.
 *
 * A row means present. Absence is the absence of a row, which is the same shape
 * the service roster uses, so the two kinds of attendance read alike.
 */
export const groupAttendance = pgTable(
  "group_attendance",
  {
    id: pk(),
    tenantId: tenantId(),
    meetingId: uuid("meeting_id").notNull().references(() => groupMeetings.id, { onDelete: "cascade" }),
    personId: uuid("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    createdAt: created(),
  },
  (t) => [
    index("group_attendance_tenant_idx").on(t.tenantId),
    index("group_attendance_meeting_idx").on(t.tenantId, t.meetingId),
    index("group_attendance_person_idx").on(t.tenantId, t.personId),
    uniqueIndex("group_attendance_unique").on(t.meetingId, t.personId),
  ],
);

/**
 * R9.5, R9.6. Somebody asking to join a group.
 *
 * A request rather than a join, because a group has a leader and a capacity and
 * sometimes a reason to say no. The decision is kept either way: a church that
 * declines somebody and keeps no record of it cannot answer the question three
 * months later when they ask why they never heard back.
 */
export const groupJoinRequests = pgTable(
  "group_join_requests",
  {
    id: pk(),
    tenantId: tenantId(),
    groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    personId: uuid("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    /** What they said when they asked. Optional, and usually empty. */
    message: text("message"),
    /** "pending", "approved" or "declined". */
    status: text("status").notNull().default("pending"),
    decidedBy: uuid("decided_by"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    /** R9.6. Whether the person has been told the answer. */
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("join_request_tenant_idx").on(t.tenantId, t.status),
    index("join_request_group_idx").on(t.tenantId, t.groupId),
    index("join_request_person_idx").on(t.tenantId, t.personId),
    // One open request a person a group. Asking twice is the same asking.
    uniqueIndex("join_request_open_unique")
      .on(t.groupId, t.personId)
      .where(sql`${t.status} = 'pending'`),
  ],
);
