"use server";

import {
  withTenant, addLocation, renameLocation, removeLocation, renameCampus,
} from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

async function context(church?: string) {
  const session = await requireSession(church);
  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId };
  return { actor, ctx: actor };
}

export interface PlaceResult {
  error?: string;
}

/** R1.2. A place this church meets in, named once and picked from a list after. */
export async function addPlace(name: string, church?: string): Promise<PlaceResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => addLocation(tx, actor, name));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function renamePlace(
  id: string,
  name: string,
  church?: string,
): Promise<PlaceResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => renameLocation(tx, actor, id, name));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function dropPlace(id: string, church?: string): Promise<PlaceResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => removeLocation(tx, actor, id));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function renameSite(
  id: string,
  name: string,
  church?: string,
): Promise<PlaceResult> {
  const { actor, ctx } = await context(church);
  try {
    await withTenant(ctx, (tx) => renameCampus(tx, actor, id, name));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
