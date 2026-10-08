import { canManageChurch, listRoles, withTenant, PERMISSIONS, PERMISSION_GROUPS } from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { SettingsHeading } from "../heading";
import { Matrix, NewRole } from "./matrix";
import { t } from "@connectapp/i18n";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("settings.tab.roles"), church);
}

/** R1.6. Every permission against every role, and the roles a church writes itself. */
export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  if (!canManageChurch(session)) {
    return <Denied role={session.role} action="editRoles" church={session.tenantSlug} />;
  }

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
  /*
   * R1.6. Member is where everybody starts, so it is not something to take up.
   * It stays in the list of roles, which is what the grid reads.
   */
  const shelf = rows.filter((role) => role.archived && role.key !== "member");

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
