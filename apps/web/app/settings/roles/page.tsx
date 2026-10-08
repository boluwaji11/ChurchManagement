import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  canManageChurch, listRoles, countArchivedRoles, withTenant,
  PERMISSIONS, PERMISSION_GROUPS, can,
} from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { SettingsHeading } from "../heading";
import { Matrix, NewRole, ArchivedRoles } from "./matrix";
import { t, plural } from "@connectapp/i18n";
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
  searchParams: Promise<{ church?: string; archived?: string }>;
}) {
  const { church, archived } = await searchParams;
  const session = await requireSession(church);
  if (!canManageChurch(session)) {
    return <Denied role={session.role} action="editRoles" church={session.tenantSlug} />;
  }

  /*
   * R1.5, R1.6, R21.2. What this reader holds, which is the most they can
   * hand out. Everything beyond it is drawn locked, because the server
   * refuses the write and a volunteer should meet the rule on the box rather
   * than on the save.
   */
  const mine = PERMISSIONS.filter((permission) => can(session, permission)) as string[];

  // R1.6. The groups the screen reads them in, flattened for the client.
  const groups = PERMISSION_GROUPS.map((group) => ({
    key: group.key,
    permissions: [...group.permissions] as string[],
  }));

  const putAway = archived === "1";

  const { roles, archivedCount } = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    async (tx) => ({
      roles: await listRoles(tx, session.tenantId, { includeArchived: true }),
      archivedCount: await countArchivedRoles(tx, session.tenantId),
    }),
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

  /*
   * R1.6. The ready-made roles this church has not taken up yet.
   *
   * Member is where everybody starts, so it is not something to take up. It
   * stays in the list of roles, which is what the grid reads. A role the church
   * wrote itself is not on this shelf either: it is a record of theirs, and it
   * is reached from the link under the matrix.
   */
  const shelf = rows.filter((role) => role.archived && role.builtin && role.key !== "member");

  // R1.6. The roles this church wrote and later put away.
  const away = rows.filter((role) => role.archived && !role.builtin);

  return (
    <>
      {putAway ? (
        <Link
          href={`/settings/roles?church=${session.tenantSlug}`}
          className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
        >
          <ArrowLeft className="size-4" /> {t("roles.archived.back")}
        </Link>
      ) : null}

      <SettingsHeading
        title={putAway ? "roles.archived.title" : "settings.tab.roles"}
        lede={putAway ? undefined : "settings.lede.roles"}
        action={
          putAway ? undefined : (
            <NewRole
              church={session.tenantSlug}
              permissions={[...PERMISSIONS]}
              groups={groups}
              shelf={shelf}
              mine={mine}
            />
          )
        }
      />

      {putAway ? (
        <ArchivedRoles
          church={session.tenantSlug}
          roles={away}
          permissions={[...PERMISSIONS]}
          mine={mine}
        />
      ) : (
        <Matrix
          church={session.tenantSlug}
          permissions={[...PERMISSIONS]}
          groups={groups}
          roles={rows}
          mine={mine}
        />
      )}

      {!putAway && archivedCount > 0 ? (
        <Link
          href={`/settings/roles?church=${session.tenantSlug}&archived=1`}
          className="self-start text-label font-medium text-primary underline-offset-4 hover:underline"
        >
          {plural("roles.archived", archivedCount)}
        </Link>
      ) : null}
    </>
  );
}
