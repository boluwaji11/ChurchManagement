"use server";

import {
  withTenant, createGroup, updateGroup, setGroupArchived,
  addToGroup, removeFromGroup, lookupPeople, getChurch,
  type GroupRole,
} from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";

async function context(church?: string) {
  const session = await requireSession(church);
  return {
    session,
    actor: { tenantId: session.tenantId, role: session.role },
    ctx: { tenantId: session.tenantId, role: session.role, userId: session.userId },
  };
}

export interface GroupResult {
  id?: string;
  error?: string;
}

const field = (data: FormData, name: string): string => String(data.get(name) ?? "").trim();
const optional = (data: FormData, name: string): string | null => field(data, name) || null;
const number = (data: FormData, name: string): number | null => {
  const raw = field(data, name);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
};

function read(data: FormData) {
  return {
    name: field(data, "name"),
    description: optional(data, "description"),
    typeId: optional(data, "typeId"),
    dayOfWeek: field(data, "dayOfWeek") === "" ? null : Number(field(data, "dayOfWeek")),
    startsAt: optional(data, "startsAt"),
    frequency: optional(data, "frequency"),
    location: optional(data, "location"),
    capacity: number(data, "capacity"),
    openToJoin: data.get("openToJoin") === "on",
    listed: data.get("listed") === "on",
  };
}

export async function create(data: FormData): Promise<GroupResult> {
  const church = field(data, "church") || undefined;
  const { actor, ctx } = await context(church);
  try {
    const group = await withTenant(ctx, (tx) => createGroup(tx, actor, read(data)));
    return { id: group.id };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function save(data: FormData): Promise<GroupResult> {
  const church = field(data, "church") || undefined;
  const { actor, ctx } = await context(church);
  try {
    const group = await withTenant(ctx, (tx) =>
      updateGroup(tx, actor, field(data, "id"), read(data)),
    );
    return { id: group.id };
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function archive(data: FormData): Promise<GroupResult> {
  const church = field(data, "church") || undefined;
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) =>
      setGroupArchived(tx, actor, field(data, "id"), field(data, "archived") === "true"),
    );
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export interface RosterResult {
  error?: string;
}

export async function join(
  groupId: string,
  personId: string,
  role: GroupRole,
  church?: string,
): Promise<RosterResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => addToGroup(tx, actor, { groupId, personId, role }));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function leave(
  groupId: string,
  personId: string,
  church?: string,
): Promise<RosterResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => removeFromGroup(tx, actor, { groupId, personId }));
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

/** R9.4. Finding somebody to put in the group, by the name a leader knows. */
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
