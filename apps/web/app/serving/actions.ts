"use server";

import {
  withTenant, createTeam, updateTeam, setTeamArchived,
  addPosition, updatePosition, setPositionArchived,
  addToTeam, removeFromTeam, setTeamMemberRole, setTeamMemberPositions,
  lookupPeople, getChurch,
  assign, unassign, candidatesFor, addBlockout, removeBlockout, setServingPreference,
  type TeamRole, type TagHue, type RotaCandidate, type ServingFrequency,
} from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";

async function context(church?: string) {
  const session = await requireSession(church);
  return {
    session,
    // R10.1. The account goes to the repository, because a team leader may
    // change the rota of the team they lead and nothing else, and only the id
    // answers which team that is.
    actor: { tenantId: session.tenantId, role: session.role, userId: session.userId },
    ctx: { tenantId: session.tenantId, role: session.role, userId: session.userId },
  };
}

const field = (data: FormData, name: string): string => String(data.get(name) ?? "").trim();
const optional = (data: FormData, name: string): string | null => field(data, name) || null;

export interface TeamResult {
  id?: string;
  error?: string;
}

export async function saveTeam(data: FormData): Promise<TeamResult> {
  const church = field(data, "church") || undefined;
  const { actor, ctx } = await context(church);
  const id = field(data, "id");
  const input = {
    name: field(data, "name"),
    description: optional(data, "description"),
    hue: (optional(data, "hue") ?? undefined) as TagHue | undefined,
  };

  try {
    const team = await withTenant(ctx, (tx) =>
      id ? updateTeam(tx, actor, id, input) : createTeam(tx, actor, input),
    );
    return { id: team.id };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function archiveTeam(data: FormData): Promise<TeamResult> {
  const church = field(data, "church") || undefined;
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) =>
      setTeamArchived(tx, actor, field(data, "id"), field(data, "archived") === "true"),
    );
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export interface PositionResult {
  error?: string;
}

export interface PositionFields {
  teamId: string;
  name: string;
  needed: number;
  withChildren: boolean;
  requiresCheck: boolean;
}

export async function savePosition(
  id: string | null,
  input: PositionFields,
  church?: string,
): Promise<PositionResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, async (tx) => {
      if (id) await updatePosition(tx, actor, id, input);
      else await addPosition(tx, actor, input);
    });
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function archivePosition(id: string, church?: string): Promise<PositionResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => setPositionArchived(tx, actor, id, true));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export interface RosterResult {
  error?: string;
}

export async function addMember(
  teamId: string,
  personId: string,
  role: TeamRole,
  church?: string,
): Promise<RosterResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => addToTeam(tx, actor, { teamId, personId, role }));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function removeMember(
  teamId: string,
  personId: string,
  church?: string,
): Promise<RosterResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => removeFromTeam(tx, actor, { teamId, personId }));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function changeRole(
  teamId: string,
  memberId: string,
  role: TeamRole,
  church?: string,
): Promise<RosterResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => setTeamMemberRole(tx, actor, { teamId, memberId, role }));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function changePositions(
  teamId: string,
  memberId: string,
  positionIds: string[],
  church?: string,
): Promise<RosterResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) =>
      setTeamMemberPositions(tx, actor, { teamId, memberId, positionIds }),
    );
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export interface PersonHit {
  id: string;
  name: string;
  household: string | null;
}

/** R10.1. Finding somebody to put on the team, by the name a leader knows. */
export async function findPerson(query: string, church?: string): Promise<PersonHit[]> {
  const { session, ctx } = await context(church);
  try {
    return await withTenant(ctx, async (tx) => {
      const profile = await getChurch(tx, session.tenantId);
      const asOf = churchNow(profile?.timezone ?? "America/Chicago").date;
      const matches = await lookupPeople(tx, query, { asOf, limit: 10 });
      return matches.map((m) => ({
        id: m.person.id,
        name: `${m.person.name} ${m.person.lastName}`,
        household: m.householdName,
      }));
    });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// R10.3 to R10.5. The rota
// ---------------------------------------------------------------------------

export interface ScheduleResult {
  error?: string;
}

export async function schedule(
  input: {
    occurrenceId: string; teamId: string; positionId: string; personId: string; anyway: boolean;
  },
  church?: string,
): Promise<ScheduleResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => assign(tx, actor, input));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function unschedule(id: string, church?: string): Promise<ScheduleResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => unassign(tx, actor, id));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R10.3. Who could fill this slot, with what the scheduler should know. */
export async function whoCouldFill(
  input: { teamId: string; positionId: string; occurrenceId: string },
  church?: string,
): Promise<RotaCandidate[]> {
  const { ctx } = await context(church);
  try {
    return await withTenant(ctx, (tx) => candidatesFor(tx, input));
  } catch {
    return [];
  }
}

export interface AvailabilityResult {
  error?: string;
}

export async function saveBlockout(data: FormData): Promise<AvailabilityResult> {
  const church = field(data, "church") || undefined;
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) =>
      addBlockout(tx, actor, {
        personId: field(data, "personId"),
        startsOn: field(data, "startsOn"),
        endsOn: field(data, "endsOn"),
        reason: optional(data, "reason"),
      }),
    );
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function dropBlockout(id: string, church?: string): Promise<AvailabilityResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => removeBlockout(tx, actor, id));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function saveFrequency(
  personId: string,
  frequency: ServingFrequency | null,
  church?: string,
): Promise<AvailabilityResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => setServingPreference(tx, actor, { personId, frequency }));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
