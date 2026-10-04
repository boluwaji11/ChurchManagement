import { redirect } from "next/navigation";
import { canManageChurch, ROLE_PERMISSIONS, PERMISSIONS, TENANT_ROLES } from "@hearth/db";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { Matrix } from "./matrix";

export const dynamic = "force-dynamic";

/** R1.6. Every permission against every role, which is what a role is made of. */
export default async function RolesPage() {
  const session = await requireSession();
  if (!canManageChurch(session.role)) redirect(`/settings/privacy?church=${session.tenantSlug}`);

  return (
    <>
      <SettingsHeading title="settings.tab.roles" lede="settings.lede.roles" />

      <Matrix
        roles={[...TENANT_ROLES]}
        permissions={[...PERMISSIONS]}
        held={Object.fromEntries(
          Object.entries(ROLE_PERMISSIONS).map(([role, list]) => [role, [...list]]),
        )}
      />
    </>
  );
}
