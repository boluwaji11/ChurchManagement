import { sql } from "drizzle-orm";
import {
  pgTable, uuid, text, integer, boolean, date, timestamp, index, uniqueIndex, primaryKey,
} from "drizzle-orm/pg-core";
import { tenants, campuses } from "./tenancy";
import { people } from "./people";
import { hue } from "./enums";

const pk = () => uuid("id").primaryKey().defaultRandom();
const tenantId = () => uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" });
const created = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updated = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/**
 * R10.1. A team: people who serve on a rota.
 *
 * A team is not a group. A group is people who meet, and what it needs is a
 * roster and a record of whether it met. A team needs positions, a schedule
 * against specific services, and somebody checking nobody is in two places at
 * one hour. Building one as the other would give a church a rota screen
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
 * decision about their own rota, and it means nothing on the production team.
 *
 * A member with no positions marked is still on the team, and still
 * schedulable. A church that runs its rota by asking out loud should not have
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
