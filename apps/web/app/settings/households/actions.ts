"use server";

import {
  withTenant, createHousehold, renameHousehold, setHouseholdArchived, mergeHouseholds,
} from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface HouseholdResult {
  error?: string;
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
    await withTenant(who, (tx) => createHousehold(tx, who, name));
    return {};
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
