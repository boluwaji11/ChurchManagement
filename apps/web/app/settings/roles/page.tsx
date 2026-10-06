import { redirect } from "next/navigation";
import { canManageChurch, listRoles, withTenant, PERMISSIONS, PERMISSION_GROUPS } from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { Matrix, NewRole } from "./matrix";

export const dynamic = "force-dynamic";

/** R1.6. Every permission against every role, and the roles a church writes itself. */
export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  if (!canManageChurch(session)) redirect(`/settings/profile?church=${session.tenantSlug}`);

  // R1.6. The groups the screen reads them in, flattened for the client.
  const groups = PERMISSION_GROUPS.map((group) => ({
    key: group.key,
    permissions: [...group.permissions] as string[],
  }));

  const roles = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    (tx) => listRoles(tx, session.tenantId, { includeArchived: true }),
  );

  const rows = roles.map((role) => ({
    id: role.id,
    key: role.key,
    name: role.name,
    permissions: [...role.permissions],
    builtin: role.builtin,
    archived: role.archived,
    members: role.members,
  }));

  // R1.6. The ready-made roles this church has not taken up yet.
  const shelf = rows.filter((role) => role.archived);

  return (
    <>
      <SettingsHeading
        title="settings.tab.roles"
        lede="settings.lede.roles"
        action={
          <NewRole
            church={session.tenantSlug}
            permissions={[...PERMISSIONS]}
            groups={groups}
            shelf={shelf}
          />
        }
      />

      <Matrix
        church={session.tenantSlug}
        permissions={[...PERMISSIONS]}
        groups={groups}
        roles={rows}
      />
    </>
  );
}
