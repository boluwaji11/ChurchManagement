import {
  listTeam, listInvitations, canManageChurch, getChurch, withTenant, formatJoinCode,
  listRoles,
} from "@hearth/db";
import { headers } from "next/headers";
import { Banner } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { Team } from "./team";
import { longDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** R1.4, R1.7. Who can get into this church, and what they may do. */
export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canManageChurch(session)) {
    return <Banner tone="info" title={t("team.title")}>{t("forbidden.askAdmin")}</Banner>;
  }

  const members = await listTeam(session.tenantId, session.userId);
  const invitations = await listInvitations(session.tenantId);

  const { profile, roles } = await withTenant(session, async (tx) => ({
    profile: await getChurch(tx, session.tenantId),
    // R1.6. The built-ins and whatever this church wrote beside them.
    roles: await listRoles(tx, session.tenantId),
  }));

  const code = profile?.joinCode ?? null;
  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host") ?? "";
  const proto = head.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return (
    <>
      <SettingsHeading title="settings.tab.team" lede="settings.lede.team" />
      <Team
        church={session.tenantSlug}
        roles={roles.map((role) => ({
          id: role.id,
          key: role.key,
          name: role.name,
          builtin: role.builtin,
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
        joinCode={code ? formatJoinCode(code) : null}
        joinLink={code ? `${proto}://${host}/join/${code}` : null}
      />
    </>
  );
}
