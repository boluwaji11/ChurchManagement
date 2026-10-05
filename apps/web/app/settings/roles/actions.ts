"use server";

import {
  withTenant, createRole, renameRole, setPermissions, archiveRole,
} from "@connectapp/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface RoleResult {
  error?: string;
}

async function actor(church?: string) {
  const session = await requireSession(church);
  return { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions };
}

/** R1.6. A role this church wrote: a name, and what it may do. */
export async function addRole(
  name: string,
  permissions: string[],
  church?: string,
): Promise<RoleResult> {
  const who = await actor(church);
  try {
    await withTenant(who, (tx) => createRole(tx, who, name, permissions));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R1.6. A name and a whole permission set, saved together. */
export async function saveRole(
  id: string,
  name: string,
  permissions: string[],
  church?: string,
): Promise<RoleResult> {
  const who = await actor(church);
  try {
    await withTenant(who, async (tx) => {
      await renameRole(tx, who, id, name);
      await setPermissions(tx, who, id, permissions);
    });
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function setRoleName(id: string, name: string, church?: string): Promise<RoleResult> {
  const who = await actor(church);
  try {
    await withTenant(who, (tx) => renameRole(tx, who, id, name));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R1.6. Putting a role away, or bringing it back. */
export async function putAway(
  id: string,
  archived: boolean,
  church?: string,
): Promise<RoleResult> {
  const who = await actor(church);
  try {
    await withTenant(who, (tx) => archiveRole(tx, who, id, archived));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
