import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { freeSlug } from "./slugs";
import { isUuid } from "./form-rules";
import { teams, teamPositions, teamMembers, teamMemberPositions } from "../schema/serving";
import { members } from "../schema/members";
import { PermissionError, type TenantRole } from "../roles";
import { can, rolesWith, type Who } from "../permissions";
import { InvalidInputError, NameTakenError } from "../errors";
import { TAG_HUES, type TagHue } from "./tags";
import type { WriteActor } from "./members";

/**
 * R10.1, R10.2. Teams, positions, and who serves on them.
 *
 * A volunteer serves across the church: the same person runs the sound desk,
 * teaches a class one week in three, and drives the van. So a team holds
 * positions and a schedule, and the person's record reads every team at once,
 * rather than each ministry keeping a list only it can see.
 *
 * What a position requires is held here, on the position, because that is a
 * claim about the job. Hearth keeps no list of what a congregant is good at.
 */

/** Teams are church structure, so creating one is staff and up. */
export const CAN_MANAGE_TEAMS: readonly TenantRole[] = rolesWith("teams.manage");
export const canManageTeams = (role: Who): boolean => can(role, "teams.manage");

/**
 * A team leader runs the schedule for the team they lead, and nothing else.
 *
 * The role exists so a worship leader can keep their own band up to date
 * without being able to edit the church's records. Which teams they lead is
 * checked against the roster, so the permission follows the person being made
 * a leader rather than something set twice.
 */
export const canLeadTeams = (role: Who): boolean => can(role, "teams.lead");

/** R10.4. What somebody is on a team. */
export const TEAM_ROLES = ["leader", "member"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export interface TeamInput {
  name: string;
  description?: string | null;
  hue?: TagHue;
  position?: number;
}

export interface PositionInput {
  teamId: string;
  name: string;
  withChildren?: boolean;
  requiresCheck?: boolean;
  needed?: number;
}

export interface Position {
  id: string;
  teamId: string;
  name: string;
  withChildren: boolean;
  requiresCheck: boolean;
  needed: number;
  position: number;
  archivedAt: Date | null;
}

export interface Team {
  id: string;
  /** R24.6. The readable part of its address. */
  slug: string;
  name: string;
  description: string | null;
  hue: TagHue;
  position: number;
  archivedAt: Date | null;
}

export interface TeamSummary extends Team {
  members: number;
  positions: number;
  /** R10.2. True when any live position on it asks for a background check. */
  needsChecks: boolean;
}

export interface TeamMemberView {
  id: string;
  memberId: string;
  /** R24.6. Their readable address, so a roster row links without an id. */
  personSlug: string;
  name: string;
  role: TeamRole;
  joinedOn: string;
  /** The positions this person plays on this team, in the team's own order. */
  positions: { id: string; name: string }[];
}

export interface TeamDetail extends Team {
  positions: Position[];
  members: TeamMemberView[];
}

/** One team a person is on, for their record. */
export interface ServingFor {
  teamId: string;
  teamName: string;
  hue: TagHue;
  role: TeamRole;
  joinedOn: string;
  positions: string[];
}

const today = (): string => new Date().toISOString().slice(0, 10);
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const displayName = (r: { firstName: string; preferredName: string | null; lastName: string }) =>
  `${r.preferredName ?? r.firstName} ${r.lastName}`;

function checkTeam(input: TeamInput): { name: string; description: string | null; hue: TagHue } {
  const name = input.name?.trim();
  if (!name) throw new InvalidInputError("team.error.name");
  if (input.hue && !TAG_HUES.includes(input.hue)) throw new InvalidInputError("team.error.hue");
  return {
    name,
    description: input.description?.trim() || null,
    hue: input.hue ?? "teal",
  };
}

const live = isNull(teams.archivedAt);

/** R10.1. Every team, with what a list of them needs to say. */
export async function listTeams(
  db: Tx,
  options: { includeArchived?: boolean } = {},
): Promise<TeamSummary[]> {
  const rows = await db
    .select({
      id: teams.id,
      slug: teams.slug,
      name: teams.name,
      description: teams.description,
      hue: teams.hue,
      position: teams.position,
      archivedAt: teams.archivedAt,
      // Written against the table name rather than the column reference,
      // because Drizzle renders a column inside sql`` unqualified and the
      // subquery would then correlate with its own row.
      members: sql<number>`(
        select count(*) from team_members m
         where m.team_id = teams.id and m.left_on is null
      )::int`,
      positions: sql<number>`(
        select count(*) from team_positions p
         where p.team_id = teams.id and p.archived_at is null
      )::int`,
      needsChecks: sql<boolean>`exists (
        select 1 from team_positions p
         where p.team_id = teams.id and p.archived_at is null and p.requires_check
      )`,
    })
    .from(teams)
    .where(options.includeArchived ? undefined : live)
    .orderBy(asc(teams.position), asc(teams.name));

  return rows.map((r) => ({ ...r, hue: r.hue as TagHue }));
}

async function positionsFor(db: Tx, teamId: string): Promise<Position[]> {
  return db
    .select({
      id: teamPositions.id,
      teamId: teamPositions.teamId,
      name: teamPositions.name,
      withChildren: teamPositions.withChildren,
      requiresCheck: teamPositions.requiresCheck,
      needed: teamPositions.needed,
      position: teamPositions.position,
      archivedAt: teamPositions.archivedAt,
    })
    .from(teamPositions)
    .where(and(eq(teamPositions.teamId, teamId), isNull(teamPositions.archivedAt)))
    .orderBy(asc(teamPositions.position), asc(teamPositions.name));
}

/** R10.1. One team: its positions and who is on it. */
export async function getTeam(db: Tx, id: string): Promise<TeamDetail | null> {
  const [team] = await db
    .select({
      id: teams.id,
      slug: teams.slug,
      name: teams.name,
      description: teams.description,
      hue: teams.hue,
      position: teams.position,
      archivedAt: teams.archivedAt,
    })
    .from(teams)
    .where(isUuid(id) ? eq(teams.id, id) : eq(teams.slug, id))
    .limit(1);
  if (!team) return null;

  // Found by its readable address or by its id, so everything after this works
  // from the record's own id rather than from whatever was in the URL.
  const teamId = team.id;

  const positions = await positionsFor(db, teamId);

  const rows = await db
    .select({
      id: teamMembers.id,
      memberId: teamMembers.memberId,
      personSlug: members.slug,
      role: teamMembers.role,
      joinedOn: sql<string>`${teamMembers.joinedOn}::text`,
      firstName: members.firstName,
      preferredName: members.preferredName,
      lastName: members.lastName,
    })
    .from(teamMembers)
    .innerJoin(members, eq(members.id, teamMembers.memberId))
    .where(and(
      eq(teamMembers.teamId, teamId),
      isNull(teamMembers.leftOn),
      isNull(members.archivedAt),
    ))
    .orderBy(asc(members.lastName), asc(members.firstName));

  const played = rows.length === 0
    ? []
    : await db
      .select({
        memberId: teamMemberPositions.memberId,
        positionId: teamMemberPositions.positionId,
      })
      .from(teamMemberPositions)
      .where(inArray(teamMemberPositions.memberId, rows.map((r) => r.id)));

  const byName = new Map(positions.map((p) => [p.id, p.name]));
  const order = new Map(positions.map((p, i) => [p.id, i]));

  return {
    ...team,
    hue: team.hue as TagHue,
    positions,
    members: rows.map((r) => ({
      id: r.id,
      memberId: r.memberId,
      personSlug: r.personSlug,
      name: displayName(r),
      role: r.role as TeamRole,
      joinedOn: r.joinedOn,
      positions: played
        .filter((p) => p.memberId === r.id && byName.has(p.positionId))
        .sort((a, b) => (order.get(a.positionId) ?? 0) - (order.get(b.positionId) ?? 0))
        .map((p) => ({ id: p.positionId, name: byName.get(p.positionId)! })),
    })),
  };
}

/** R10.1, R10.3. Every team one person serves on, for their record. */
export async function servingForPerson(db: Tx, memberId: string): Promise<ServingFor[]> {
  const rows = await db
    .select({
      memberId: teamMembers.id,
      teamId: teams.id,
      teamName: teams.name,
      hue: teams.hue,
      role: teamMembers.role,
      joinedOn: sql<string>`${teamMembers.joinedOn}::text`,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(and(
      eq(teamMembers.memberId, memberId),
      isNull(teamMembers.leftOn),
      isNull(teams.archivedAt),
    ))
    .orderBy(asc(teams.position), asc(teams.name));

  if (rows.length === 0) return [];

  const played = await db
    .select({
      memberId: teamMemberPositions.memberId,
      name: teamPositions.name,
      order: teamPositions.position,
    })
    .from(teamMemberPositions)
    .innerJoin(teamPositions, eq(teamPositions.id, teamMemberPositions.positionId))
    .where(and(
      inArray(teamMemberPositions.memberId, rows.map((r) => r.memberId)),
      isNull(teamPositions.archivedAt),
    ));

  return rows.map((r) => ({
    teamId: r.teamId,
    teamName: r.teamName,
    hue: r.hue as TagHue,
    role: r.role as TeamRole,
    joinedOn: r.joinedOn,
    positions: played
      .filter((p) => p.memberId === r.memberId)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      .map((p) => p.name),
  }));
}

/** True when this account leads that team, which is what scopes a team leader. */
export async function leadsTeam(db: Tx, teamId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .innerJoin(members, eq(members.id, teamMembers.memberId))
    .where(and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.role, "leader"),
      isNull(teamMembers.leftOn),
      eq(members.appUserId, userId),
    ))
    .limit(1);
  return row !== undefined;
}

export async function createTeam(db: Tx, actor: WriteActor, input: TeamInput): Promise<TeamDetail> {
  if (!canManageTeams(actor.role)) throw new PermissionError(actor.role, "manageTeams");
  const values = checkTeam(input);

  const [taken] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(sql`lower(${teams.name}) = lower(${values.name})`)
    .limit(1);
  if (taken) throw new NameTakenError("team.error.taken", values.name, taken.id);

  const [row] = await db
    .insert(teams)
    .values({
      tenantId: actor.tenantId,
      ...values,
      slug: await freeSlug(
        values.name,
        async (candidate) => {
          const [clash] = await db
            .select({ id: teams.id })
            .from(teams)
            .where(eq(teams.slug, candidate))
            .limit(1);
          return Boolean(clash);
        },
        "team",
      ),
      position: input.position ?? 0,
    })
    .returning({ id: teams.id });

  return (await getTeam(db, row!.id))!;
}

export async function updateTeam(
  db: Tx,
  actor: WriteActor,
  id: string,
  input: TeamInput,
): Promise<TeamDetail> {
  if (!canManageTeams(actor.role)) throw new PermissionError(actor.role, "manageTeams");
  const values = checkTeam(input);

  const [taken] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(sql`lower(${teams.name}) = lower(${values.name})`)
    .limit(1);
  if (taken && taken.id !== id) {
    throw new NameTakenError("team.error.taken", values.name, taken.id);
  }

  const changed = await db
    .update(teams)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(teams.id, id))
    .returning({ id: teams.id });
  if (changed.length === 0) throw new InvalidInputError("team.error.missing");

  return (await getTeam(db, id))!;
}

/**
 * R2.13 again, for a team. Archiving keeps the schedule that was run.
 *
 * A church that reorganises its ministries still has to answer who was on the
 * sound desk in 2027.
 */
export async function setTeamArchived(
  db: Tx,
  actor: WriteActor,
  id: string,
  archived: boolean,
): Promise<void> {
  if (!canManageTeams(actor.role)) throw new PermissionError(actor.role, "manageTeams");

  const changed = await db
    .update(teams)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(teams.id, id))
    .returning({ id: teams.id });
  if (changed.length === 0) throw new InvalidInputError("team.error.missing");
}

function checkPosition(input: PositionInput): { name: string; needed: number } {
  const name = input.name?.trim();
  if (!name) throw new InvalidInputError("position.error.name");
  const needed = input.needed ?? 1;
  if (!Number.isInteger(needed) || needed < 1 || needed > 99) {
    throw new InvalidInputError("position.error.needed");
  }
  return { name, needed };
}

export async function addPosition(
  db: Tx,
  actor: WriteActor,
  input: PositionInput,
): Promise<Position> {
  if (!canManageTeams(actor.role)) throw new PermissionError(actor.role, "manageTeams");
  const { name, needed } = checkPosition(input);

  const [taken] = await db
    .select({ id: teamPositions.id })
    .from(teamPositions)
    .where(and(
      eq(teamPositions.teamId, input.teamId),
      sql`lower(${teamPositions.name}) = lower(${name})`,
    ))
    .limit(1);
  if (taken) throw new NameTakenError("position.error.taken", name, taken.id);

  const [last] = await db
    .select({ at: sql<number>`coalesce(max(${teamPositions.position}), -1)::int` })
    .from(teamPositions)
    .where(eq(teamPositions.teamId, input.teamId));

  const [row] = await db
    .insert(teamPositions)
    .values({
      tenantId: actor.tenantId,
      teamId: input.teamId,
      name,
      needed,
      withChildren: input.withChildren ?? false,
      // R10.2. A position with children asks for a check unless the church says
      // otherwise, because the church that forgets to tick it is the case this
      // requirement exists for.
      requiresCheck: input.requiresCheck ?? input.withChildren ?? false,
      position: (last?.at ?? -1) + 1,
    })
    .returning({ id: teamPositions.id });

  const [made] = await db
    .select({
      id: teamPositions.id,
      teamId: teamPositions.teamId,
      name: teamPositions.name,
      withChildren: teamPositions.withChildren,
      requiresCheck: teamPositions.requiresCheck,
      needed: teamPositions.needed,
      position: teamPositions.position,
      archivedAt: teamPositions.archivedAt,
    })
    .from(teamPositions)
    .where(eq(teamPositions.id, row!.id))
    .limit(1);

  return made!;
}

export async function updatePosition(
  db: Tx,
  actor: WriteActor,
  id: string,
  input: PositionInput,
): Promise<void> {
  if (!canManageTeams(actor.role)) throw new PermissionError(actor.role, "manageTeams");
  const { name, needed } = checkPosition(input);

  const [taken] = await db
    .select({ id: teamPositions.id })
    .from(teamPositions)
    .where(and(
      eq(teamPositions.teamId, input.teamId),
      sql`lower(${teamPositions.name}) = lower(${name})`,
    ))
    .limit(1);
  if (taken && taken.id !== id) {
    throw new NameTakenError("position.error.taken", name, taken.id);
  }

  const changed = await db
    .update(teamPositions)
    .set({
      name,
      needed,
      withChildren: input.withChildren ?? false,
      requiresCheck: input.requiresCheck ?? false,
      updatedAt: new Date(),
    })
    .where(eq(teamPositions.id, id))
    .returning({ id: teamPositions.id });
  if (changed.length === 0) throw new InvalidInputError("position.error.missing");
}

/**
 * Archiving a position keeps every schedule it was ever on.
 *
 * It also comes off the members who played it, because "who can do this" is a
 * question about now.
 */
export async function setPositionArchived(
  db: Tx,
  actor: WriteActor,
  id: string,
  archived: boolean,
): Promise<void> {
  if (!canManageTeams(actor.role)) throw new PermissionError(actor.role, "manageTeams");

  const changed = await db
    .update(teamPositions)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(teamPositions.id, id))
    .returning({ id: teamPositions.id });
  if (changed.length === 0) throw new InvalidInputError("position.error.missing");

  if (archived) {
    await db.delete(teamMemberPositions).where(eq(teamMemberPositions.positionId, id));
  }
}

/** The order the team reads its positions in. */
export async function reorderPositions(
  db: Tx,
  actor: WriteActor,
  teamId: string,
  ids: string[],
): Promise<void> {
  if (!canManageTeams(actor.role)) throw new PermissionError(actor.role, "manageTeams");

  for (const [index, id] of ids.entries()) {
    await db
      .update(teamPositions)
      .set({ position: index, updatedAt: new Date() })
      .where(and(eq(teamPositions.id, id), eq(teamPositions.teamId, teamId)));
  }
}

export interface RosterInput {
  teamId: string;
  memberId: string;
  role?: TeamRole;
  joinedOn?: string;
  /** The positions they play. An empty list is a member the team schedules by name. */
  positionIds?: string[];
}

async function requireRoster(db: Tx, actor: WriteActor, teamId: string): Promise<void> {
  if (canManageTeams(actor.role)) return;
  if (actor.role === "team_leader" && actor.userId && await leadsTeam(db, teamId, actor.userId)) {
    return;
  }
  throw new PermissionError(actor.role, "manageTeamRoster");
}

/** Replaces the positions a member plays with exactly the ones given. */
async function setPositions(
  db: Tx,
  actor: WriteActor,
  memberId: string,
  teamId: string,
  positionIds: string[],
): Promise<void> {
  await db.delete(teamMemberPositions).where(eq(teamMemberPositions.memberId, memberId));
  if (positionIds.length === 0) return;

  // A position has to belong to this team. Anything else is a stale form or a
  // crafted request, and either way it is not a position this person plays.
  const theirs = await db
    .select({ id: teamPositions.id })
    .from(teamPositions)
    .where(and(
      eq(teamPositions.teamId, teamId),
      isNull(teamPositions.archivedAt),
      inArray(teamPositions.id, positionIds),
    ));
  if (theirs.length === 0) return;

  await db.insert(teamMemberPositions).values(
    theirs.map((p) => ({ tenantId: actor.tenantId, memberId, positionId: p.id })),
  );
}

/** R10.1. Puts somebody on a team, or brings them back onto it. */
export async function addToTeam(
  db: Tx,
  actor: WriteActor,
  input: RosterInput,
): Promise<{ memberId: string }> {
  await requireRoster(db, actor, input.teamId);

  const joinedOn = input.joinedOn ?? today();
  if (!ISO.test(joinedOn)) throw new InvalidInputError("team.error.date");

  const [person] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.id, input.memberId), isNull(members.archivedAt)))
    .limit(1);
  if (!person) throw new InvalidInputError("error.notFound.person");

  const [already] = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(and(
      eq(teamMembers.teamId, input.teamId),
      eq(teamMembers.memberId, input.memberId),
      isNull(teamMembers.leftOn),
    ))
    .limit(1);

  const memberId = already
    ? already.id
    : (await db
      .insert(teamMembers)
      .values({
        tenantId: actor.tenantId,
        teamId: input.teamId,
        memberId: input.memberId,
        role: input.role ?? "member",
        joinedOn,
      })
      .returning({ id: teamMembers.id }))[0]!.id;

  if (already && input.role) {
    await db
      .update(teamMembers)
      .set({ role: input.role, updatedAt: new Date() })
      .where(eq(teamMembers.id, memberId));
  }

  if (input.positionIds) {
    await setPositions(db, actor, memberId, input.teamId, input.positionIds);
  }

  return { memberId };
}

/** R10.1. What this person plays on this team, replaced wholesale. */
export async function setTeamMemberPositions(
  db: Tx,
  actor: WriteActor,
  input: { teamId: string; memberId: string; positionIds: string[] },
): Promise<void> {
  await requireRoster(db, actor, input.teamId);

  const [member] = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(and(eq(teamMembers.id, input.memberId), eq(teamMembers.teamId, input.teamId)))
    .limit(1);
  if (!member) throw new InvalidInputError("team.error.member");

  await setPositions(db, actor, input.memberId, input.teamId, input.positionIds);
}

export async function setTeamMemberRole(
  db: Tx,
  actor: WriteActor,
  input: { teamId: string; memberId: string; role: TeamRole },
): Promise<void> {
  await requireRoster(db, actor, input.teamId);

  const changed = await db
    .update(teamMembers)
    .set({ role: input.role, updatedAt: new Date() })
    .where(and(eq(teamMembers.id, input.memberId), eq(teamMembers.teamId, input.teamId)))
    .returning({ id: teamMembers.id });
  if (changed.length === 0) throw new InvalidInputError("team.error.member");
}

/**
 * R10.1. Somebody steps off the team.
 *
 * A date rather than a deletion, so the schedule that was run stays answerable.
 */
export async function removeFromTeam(
  db: Tx,
  actor: WriteActor,
  input: { teamId: string; memberId: string; on?: string },
): Promise<void> {
  await requireRoster(db, actor, input.teamId);

  const on = input.on ?? today();
  if (!ISO.test(on)) throw new InvalidInputError("team.error.date");

  const changed = await db
    .update(teamMembers)
    .set({ leftOn: on, updatedAt: new Date() })
    .where(and(
      eq(teamMembers.teamId, input.teamId),
      eq(teamMembers.memberId, input.memberId),
      isNull(teamMembers.leftOn),
    ))
    .returning({ id: teamMembers.id });
  if (changed.length === 0) throw new InvalidInputError("team.error.member");

  await db
    .delete(teamMemberPositions)
    .where(inArray(teamMemberPositions.memberId, changed.map((c) => c.id)));
}

/**
 * R10.1. The five teams almost every church in the target already runs, with
 * the positions each one schedules.
 *
 * A church renames, deletes and adds to these. They exist so that the first
 * person to open Serving sees their church rather than an empty screen and a
 * form asking what a position is.
 */
export const SEED_TEAMS: readonly {
  name: string;
  hue: TagHue;
  positions: readonly { name: string; needed?: number; withChildren?: boolean }[];
}[] = [
  {
    name: "Worship",
    hue: "violet",
    positions: [
      { name: "Worship leader" },
      { name: "Vocals", needed: 2 },
      { name: "Keys" },
      { name: "Acoustic guitar" },
      { name: "Bass" },
      { name: "Drums" },
    ],
  },
  {
    name: "Production",
    hue: "indigo",
    positions: [
      { name: "Sound" },
      { name: "Slides" },
      { name: "Camera" },
    ],
  },
  {
    name: "Welcome",
    hue: "amber",
    positions: [
      { name: "Door" },
      { name: "Hospitality", needed: 2 },
      { name: "Information desk" },
    ],
  },
  {
    name: "Ushers",
    hue: "fern",
    positions: [
      { name: "Usher", needed: 4 },
      { name: "Offering" },
    ],
  },
  {
    name: "Children",
    hue: "rose",
    positions: [
      { name: "Room leader", withChildren: true, needed: 2 },
      { name: "Helper", withChildren: true, needed: 2 },
      { name: "Check-in desk" },
    ],
  },
];

export async function seedTeams(db: Tx, actor: WriteActor): Promise<number> {
  if (!canManageTeams(actor.role)) throw new PermissionError(actor.role, "manageTeams");

  const existing = await db.select({ id: teams.id }).from(teams).limit(1);
  if (existing.length > 0) return 0;

  let made = 0;
  for (const [index, seed] of SEED_TEAMS.entries()) {
    const team = await createTeam(db, actor, {
      name: seed.name,
      hue: seed.hue,
      position: index,
    });
    for (const p of seed.positions) {
      await addPosition(db, actor, {
        teamId: team.id,
        name: p.name,
        needed: p.needed ?? 1,
        withChildren: p.withChildren ?? false,
      });
    }
    made += 1;
  }
  return made;
}

/** R10.2. The live positions on each of these teams, in the team's own order. */
export async function positionsForTeams(
  db: Tx,
  teamIds: string[],
): Promise<Record<string, { id: string; name: string; needed: number }[]>> {
  const out: Record<string, { id: string; name: string; needed: number }[]> = {};
  if (teamIds.length === 0) return out;

  const rows = await db
    .select({
      teamId: teamPositions.teamId,
      id: teamPositions.id,
      name: teamPositions.name,
      needed: teamPositions.needed,
    })
    .from(teamPositions)
    .where(and(inArray(teamPositions.teamId, teamIds), isNull(teamPositions.archivedAt)))
    .orderBy(asc(teamPositions.position), asc(teamPositions.name));

  for (const row of rows) {
    (out[row.teamId] ??= []).push({ id: row.id, name: row.name, needed: row.needed });
  }
  return out;
}
