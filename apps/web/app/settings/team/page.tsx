import {
  listTeam, listInvitations, canManageChurch, withTenant,
  listRoles,
} from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { shellData } from "@/lib/shell-data";
import { SettingsHeading } from "../heading";
import { Team } from "./team";
import { longDate } from "@/lib/dates";
import { Denied } from "@/components/denied";
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
  return tabMetadata(t("settings.tab.team"), church);
}

/** R1.4, R1.7. Who can get into this church, and what they may do. */
export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canManageChurch(session)) {
    return <Denied role={session.role} action="editChurch" church={session.tenantSlug} />;
  }

  const [members, invitations, roles, shell] = await Promise.all([
    listTeam(session.tenantId, session.userId),
    listInvitations(session.tenantId),
    // R1.6. The built-ins and whatever this church wrote beside them.
    /*
     * R1.6. Including the ones put away: somebody can still be on a role the
     * church has since taken off its list, and a picker with no row for the
     * role they hold shows an empty box.
     */
    withTenant(session, (tx) => listRoles(tx, session.tenantId, { includeArchived: true })),
    /*
     * R1.1. Invitations open once somebody has looked at the church. The frame
     * around this screen has already read where the church stands, so this is
     * the answer it already has rather than a second transaction for it.
     */
    shellData(session),
  ]);
  const standing = shell.standing;

  return (
    <>
      <SettingsHeading title="settings.tab.team" lede="settings.lede.team" />
      <Team
        approved={standing.approved}
        church={session.tenantSlug}
        roles={roles.map((role) => ({
          id: role.id,
          key: role.key,
          name: role.name,
          builtin: role.builtin,
          archived: role.archived,
          permissions: [...role.permissions],
        }))}
        members={members.map((member) => ({
          ...member,
          lastSignedIn: member.lastSignedInAt
            ? longDate(member.lastSignedInAt.toISOString().slice(0, 10))
            : null,
        }))}
        invitations={invitations.map((invitation) => ({
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt.toLocaleDateString("en-US", {
            day: "numeric", month: "long",
          }),
        }))}
      />
    </>
  );
}
