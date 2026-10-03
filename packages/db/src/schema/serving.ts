import { sql } from "drizzle-orm";
import {
  pgTable, uuid, text, integer, boolean, date, timestamp, index, uniqueIndex, primaryKey,
} from "drizzle-orm/pg-core";
import { tenants, campuses } from "./tenancy";
import { serviceOccurrences } from "./gatherings";
import { people } from "./people";
import { hue } from "./enums";

const pk = () => uuid("id").primaryKey().defaultRandom();
const tenantId = () => uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" });
const created = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updated = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/**
 * R10.1. A team: people who serve on a schedule.
 *
 * A team is not a group. A group is people who meet, and what it needs is a
 * roster and a record of whether it met. A team needs positions, a schedule
 * against specific services, and somebody checking nobody is in two places at
 * one hour. Building one as the other would give a church a schedule screen
 * pretending to be a roster screen.
 *
 * The hue is the same spectrum the rest of the product assigns to things, so a
 * person's record reads at a glance when they are on four teams.
 */
export const teams = pgTable(
  "teams",
  {
    id: pk(),
    tenantId: tenantId(),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    /** What the team does, in the church's words. */
    description: text("description"),
    hue: hue("hue").notNull().default("teal"),
    position: integer("position").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("team_tenant_idx").on(t.tenantId),
    uniqueIndex("team_name_unique").on(t.tenantId, t.name),
  ],
);

/**
 * R10.1. A named position on a team: the thing somebody is scheduled to do.
 *
 * Worship has a keys player, two vocalists and a drummer. Production has sound
 * and slides. The position is what a schedule holds, because "Dayo is on
 * worship" does not tell the band whether anybody is playing bass.
 *
 * `needed` is how many the church wants at one service, which is what the
 * coverage gaps in R10.12 count against.
 */
export const teamPositions = pgTable(
  "team_positions",
  {
    id: pk(),
    tenantId: tenantId(),
    teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /**
     * R10.9. Whether this position puts somebody with children. Separate from
     * the team, because the kids team has a room leader who is with children
     * and a check-in desk volunteer who is not.
     */
    withChildren: boolean("with_children").notNull().default(false),
    /**
     * R10.2. Whether a valid background check is required before anybody is
     * scheduled here. The hard gate that reads it is R10.9, in the children's
     * ministry pass. This records the church's decision now, so the gate has
     * something to enforce when it lands.
     */
    requiresCheck: boolean("requires_check").notNull().default(false),
    /** How many the church wants in this position at one service. */
    needed: integer("needed").notNull().default(1),
    position: integer("position").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("team_position_tenant_idx").on(t.tenantId),
    index("team_position_team_idx").on(t.tenantId, t.teamId),
    uniqueIndex("team_position_name_unique").on(t.teamId, t.name),
  ],
);

/**
 * R10.1, R10.3. Somebody on a team.
 *
 * The same person runs the sound desk, teaches a class one week in three, and
 * drives the van. So this is a person's serving across the church rather than a
 * list each ministry keeps, and the scheduler reads all of it at once.
 */
export const teamMembers = pgTable(
  "team_members",
  {
    id: pk(),
    tenantId: tenantId(),
    teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
    personId: uuid("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    /** "leader" or "member". A co-leader is a leader. */
    role: text("role").notNull().default("member"),
    joinedOn: date("joined_on").notNull(),
    leftOn: date("left_on"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("team_member_tenant_idx").on(t.tenantId),
    index("team_member_team_idx").on(t.tenantId, t.teamId),
    index("team_member_person_idx").on(t.tenantId, t.personId),
    // One live membership a person a team. Somebody who steps off and comes
    // back gets a second row, which is the history worth keeping.
    uniqueIndex("team_member_live_unique")
      .on(t.teamId, t.personId)
      .where(sql`${t.leftOn} is null`),
  ],
);

/**
 * R10.2. Which positions this person plays.
 *
 * The question a scheduler asks is "who can do this", and the answer is held
 * per team rather than as a property of the person. Hearth does not keep a
 * list of what a congregant is good at: it keeps what a team has asked of
 * them. So a worship leader marking somebody as a vocalist is recording a
 * decision about their own schedule, and it means nothing on the production team.
 *
 * A member with no positions marked is still on the team, and still
 * schedulable. A church that runs its schedule by asking out loud should not have
 * to fill this in.
 */
export const teamMemberPositions = pgTable(
  "team_member_positions",
  {
    tenantId: tenantId(),
    memberId: uuid("member_id").notNull().references(() => teamMembers.id, { onDelete: "cascade" }),
    positionId: uuid("position_id").notNull().references(() => teamPositions.id, { onDelete: "cascade" }),
    createdAt: created(),
  },
  (t) => [
    primaryKey({ columns: [t.memberId, t.positionId] }),
    index("tmp_tenant_idx").on(t.tenantId),
    index("tmp_position_idx").on(t.tenantId, t.positionId),
  ],
);

/**
 * R10.3. One person, in one position, at one gathering.
 *
 * The schedule is held against the service occurrence rather than against a
 * date, because a church with two services on the same day schedules two
 * different bands and a row holding only a date cannot say which.
 *
 * The status is the volunteer's answer (R10.6). It starts as asked, and the
 * screens read "asked" as "probably there, chase it".
 */
export const servingAssignments = pgTable(
  "serving_assignments",
  {
    id: pk(),
    tenantId: tenantId(),
    occurrenceId: uuid("occurrence_id").notNull()
      .references(() => serviceOccurrences.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
    positionId: uuid("position_id").notNull()
      .references(() => teamPositions.id, { onDelete: "cascade" }),
    personId: uuid("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    /** "asked", "accepted" or "declined". */
    status: text("status").notNull().default("asked"),
    /**
     * R10.6. The link a volunteer answers on, with no sign-in.
     *
     * Generated by the database so a row cannot exist without one. It is a
     * bearer credential: whoever holds it can answer for this person, on this
     * one assignment, and see nothing else.
     */
    respondToken: text("respond_token").notNull()
      .default(sql`replace(gen_random_uuid()::text, '-', '')`),
    /** R10.6. Why they cannot, in their own words, where they gave one. */
    declineReason: text("decline_reason"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    /**
     * R10.4. True where the scheduler was warned and went ahead: a blockout, or
     * somebody already serving at that hour. Kept because the answer to "why is
     * she down twice" has to be answerable later.
     */
    overridden: boolean("overridden").notNull().default(false),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("assignment_tenant_idx").on(t.tenantId),
    index("assignment_occurrence_idx").on(t.tenantId, t.occurrenceId),
    index("assignment_person_idx").on(t.tenantId, t.personId),
    index("assignment_team_idx").on(t.tenantId, t.teamId, t.occurrenceId),
    // The same person is not put in the same position twice at one gathering.
    uniqueIndex("assignment_unique").on(t.occurrenceId, t.positionId, t.personId),
    uniqueIndex("assignment_token_unique").on(t.respondToken),
  ],
);

/**
 * R10.4. Days a volunteer has said they cannot serve.
 *
 * Inclusive at both ends, because somebody writing "the 14th to the 21st" means
 * both of those days. The scheduler warns rather than refuses: a church that
 * cannot put somebody down after asking them in the corridor has software
 * getting in the way of a conversation that already happened.
 */
export const blockoutDates = pgTable(
  "blockout_dates",
  {
    id: pk(),
    tenantId: tenantId(),
    personId: uuid("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    /** "Away", "Surgery". Theirs, and nobody is required to give one. */
    reason: text("reason"),
    createdAt: created(),
  },
  (t) => [
    index("blockout_tenant_idx").on(t.tenantId),
    index("blockout_person_idx").on(t.tenantId, t.personId, t.startsOn),
  ],
);

/**
 * R10.5. How often somebody is willing to serve.
 *
 * A preference, shown to whoever builds the schedule. Nothing enforces it, because
 * the person who says once a month and then covers three weeks running has not
 * broken a rule.
 */
export const servingPreferences = pgTable(
  "serving_preferences",
  {
    tenantId: tenantId(),
    personId: uuid("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
    /** "weekly", "fortnightly", "monthly", "quarterly". */
    frequency: text("frequency").notNull(),
    updatedAt: updated(),
  },
  (t) => [
    primaryKey({ columns: [t.personId] }),
    index("serving_pref_tenant_idx").on(t.tenantId),
  ],
);

/**
 * R10.7. Somebody who cannot make it asks for a swap.
 *
 * The request hangs off the assignment rather than off the person, because the
 * question is about one slot at one gathering. A leader confirms the
 * replacement; the system offers names and decides nothing, since who covers
 * the sound desk is a judgement about people.
 */
export const substituteRequests = pgTable(
  "substitute_requests",
  {
    id: pk(),
    tenantId: tenantId(),
    assignmentId: uuid("assignment_id").notNull()
      .references(() => servingAssignments.id, { onDelete: "cascade" }),
    /** Theirs, and nobody is required to give one. */
    reason: text("reason"),
    /** "open", "filled", "withdrawn" or "cancelled". */
    status: text("status").notNull().default("open"),
    /** Who the leader put in instead, once they have. */
    filledByPersonId: uuid("filled_by_person_id").references(() => people.id, { onDelete: "set null" }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("substitute_tenant_idx").on(t.tenantId),
    index("substitute_assignment_idx").on(t.tenantId, t.assignmentId),
    // One open request a slot. Asking twice is asking once.
    uniqueIndex("substitute_open_unique")
      .on(t.assignmentId)
      .where(sql`${t.status} = 'open'`),
  ],
);
