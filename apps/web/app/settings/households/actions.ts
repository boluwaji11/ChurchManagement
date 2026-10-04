"use server";

import {
  withTenant, createHousehold, renameHousehold, setHouseholdArchived, mergeHouseholds,
  peopleWithoutHousehold, addToHousehold, removeFromHousehold, setHouseholdRole,
} from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface HouseholdResult {
  error?: string;
  /** The household just made, so the caller can carry on filling it. */
  id?: string;
}

async function actor(church?: string) {
  const session = await requireSession(church);
  return {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };
}

/** R2.1. A new family, named before anybody is put in it. */
export async function add(name: string, church?: string): Promise<HouseholdResult> {
  const who = await actor(church);
  try {
    const made = await withTenant(who, (tx) => createHousehold(tx, who, name));
    return { id: made.id };
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R2.1. What a church calls this family. */
export async function setName(
  id: string,
  name: string,
  church?: string,
): Promise<HouseholdResult> {
  const who = await actor(church);
  try {
    await withTenant(who, (tx) => renameHousehold(tx, who, id, name));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R2.1. Putting a household away, or bringing it back. */
export async function putAway(
  id: string,
  archived: boolean,
  church?: string,
): Promise<HouseholdResult> {
  const who = await actor(church);
  try {
    await withTenant(who, (tx) => setHouseholdArchived(tx, who, id, archived));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R2.1. People a church could put into a household: those in none. */
export async function freePeople(
  search: string,
  church?: string,
): Promise<{ id: string; name: string }[]> {
  const who = await actor(church);
  return withTenant(who, (tx) => peopleWithoutHousehold(tx, search));
}

/** R2.1. Putting somebody into a household from the household's own screen. */
export async function putIn(
  householdId: string,
  personId: string,
  church?: string,
): Promise<HouseholdResult> {
  const who = await actor(church);
  try {
    await withTenant(who, (tx) => addToHousehold(tx, who, householdId, personId));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R2.1. What somebody is in their household. */
export async function setRole(
  householdId: string,
  personId: string,
  role: string,
  church?: string,
): Promise<HouseholdResult> {
  const who = await actor(church);
  try {
    await withTenant(who, (tx) => setHouseholdRole(tx, who, householdId, personId, role));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R2.1. Taking somebody out. Their own record is untouched. */
export async function takeOut(
  householdId: string,
  personId: string,
  church?: string,
): Promise<HouseholdResult> {
  const who = await actor(church);
  try {
    await withTenant(who, (tx) => removeFromHousehold(tx, who, householdId, personId));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R2.1. Two halves of one family, put back together. */
export async function fold(
  fromId: string,
  intoId: string,
  church?: string,
): Promise<HouseholdResult> {
  const who = await actor(church);
  try {
    await withTenant(who, (tx) => mergeHouseholds(tx, who, fromId, intoId));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
