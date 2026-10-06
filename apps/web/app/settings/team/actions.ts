"use server";

import {
  createInvitation, revokeInvitation, setMemberRole, canManageChurch,
  withTenant, peopleToInvite, listRoles, owner,
  type TenantRole,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface TeamResult {
  error?: string;
}

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
const ROLES: TenantRole[] = [
  "owner", "admin", "staff", "pastoral", "finance", "group_leader", "checkin_volunteer", "member",
];

async function allowed(church?: string) {
  const session = await requireSession(church);
  if (!canManageChurch(session)) throw new Error(t("forbidden.askAdmin"));
  return session;
}

/** R1.7. Inviting somebody, by the address they will sign in with. */
export async function invite(data: FormData): Promise<TeamResult> {
  try {
    const session = await allowed(field(data, "church") || undefined);
    const email = field(data, "email").toLowerCase();

    if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) return { error: t("team.error.email") };

    /*
     * R1.6. The church picks one of its own roles, so what arrives is a row id.
     * It is read back here rather than trusted: a built-in travels as its key
     * and a church's own role as its id, and anything else is refused.
     */
    const chosen = await withTenant(
      { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
      (tx) => listRoles(tx, session.tenantId),
    );
    const picked = chosen.find((one) => one.id === field(data, "role") && !one.archived);
    if (!picked) return { error: t("team.error.role") };

    const role = (picked.builtin ? picked.key : "member") as TenantRole;
    if (!ROLES.includes(role)) return { error: t("team.error.role") };

    await createInvitation({
      tenantId: session.tenantId,
      email,
      role,
      roleId: picked.builtin ? null : picked.id,
      invitedByUserId: session.userId,
      // R1.7. Where the church picked somebody it already holds, the account
      // ties to that record on first sign-in.
      memberId: field(data, "memberId") || null,
    });

    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function withdraw(id: string, church?: string): Promise<TeamResult> {
  try {
    await allowed(church);
    await revokeInvitation(id);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R1.4. Changing what somebody may do. */
export async function changeRole(
  userId: string,
  role: TenantRole,
  church?: string,
  /** R1.6. A role this church wrote, where they picked one. */
  roleId?: string | null,
): Promise<TeamResult> {
  try {
    const session = await allowed(church);

    /*
     * R1.4. An Owner's row is only an Owner's to change. Admin may run the
     * church; it may not take the keys off the person who holds them.
     */
    const [row] = await owner()<{ role: string }[]>`
      select role::text as role from tenant_members
       where tenant_id = ${session.tenantId} and user_id = ${userId}
       limit 1`;
    if (row?.role === "owner" && session.role !== "owner") {
      return { error: t("team.error.owner") };
    }
    if (role === "owner" && session.role !== "owner") {
      return { error: t("team.error.onlyOwner") };
    }

    await setMemberRole(session.tenantId, userId, role, roleId ?? null);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/**
 * R1.4. Taking somebody's access away puts them back on Member.
 *
 * Deleting the membership outright left a person with a record in the church
 * and no way into the portal that is theirs: the directory, their household,
 * their own serving. Member is the floor, so that is where somebody who should
 * no longer be running things lands.
 *
 * An Owner is never put back. There is nobody above them to undo it, and a
 * church whose last Owner was demoted by an Admin has lost its own keys.
 */
export async function removeAccess(userId: string, church?: string): Promise<TeamResult> {
  try {
    const session = await allowed(church);

    const [row] = await owner()<{ role: string }[]>`
      select role::text as role from tenant_members
       where tenant_id = ${session.tenantId} and user_id = ${userId}
       limit 1`;
    if (!row) return { error: t("team.error.gone") };
    if (row.role === "owner") return { error: t("team.error.owner") };

    const member = await withTenant(
      { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
      (tx) => listRoles(tx, session.tenantId),
    ).then((all) => all.find((one) => one.builtin && one.key === "member"));

    await setMemberRole(session.tenantId, userId, "member", member?.id ?? null);
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}


/** R1.7. People in the directory who could be given an account. */
export async function invitees(
  search: string,
  church?: string,
): Promise<{ id: string; name: string; email: string }[]> {
  const session = await allowed(church);
  return withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    (tx) => peopleToInvite(tx, search),
  );
}
