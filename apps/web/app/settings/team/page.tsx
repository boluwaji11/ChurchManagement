import {
  listTeam, listInvitations, canManageChurch, getChurch, withTenant, formatJoinCode,
} from "@hearth/db";
import { headers } from "next/headers";
import { Banner } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { Team } from "./team";

export const dynamic = "force-dynamic";

/** R1.4, R1.7. Who can get into this church, and what they may do. */
export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canManageChurch(session.role)) {
    return <Banner tone="info" title={t("team.title")}>{t("forbidden.askAdmin")}</Banner>;
  }

  const members = await listTeam(session.tenantId, session.userId);
  const invitations = await listInvitations(session.tenantId);

  const profile = await withTenant(session, (tx) => getChurch(tx, session.tenantId));

  const code = profile?.joinCode ?? null;
  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host") ?? "";
  const proto = head.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return (
    <Team
      church={session.tenantSlug}
      members={members}
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
  );
}
