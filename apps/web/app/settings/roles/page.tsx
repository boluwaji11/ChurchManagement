import { redirect } from "next/navigation";
import { canManageChurch, listRoles, withTenant, PERMISSIONS } from "@hearth/db";
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

  const roles = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    (tx) => listRoles(tx, session.tenantId, { includeArchived: true }),
  );

  return (
    <>
      <SettingsHeading
        title="settings.tab.roles"
        lede="settings.lede.roles"
        action={<NewRole church={session.tenantSlug} permissions={[...PERMISSIONS]} />}
      />

      <Matrix
        church={session.tenantSlug}
        permissions={[...PERMISSIONS]}
        roles={roles.map((role) => ({
          id: role.id,
          key: role.key,
          name: role.name,
          permissions: [...role.permissions],
          builtin: role.builtin,
          archived: role.archived,
          members: role.members,
        }))}
      />
    </>
  );
}
