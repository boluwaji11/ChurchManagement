import { redirect } from "next/navigation";
import {
  withTenant, personForUser, householdFor, canEditPeople, canReadIncidents,
} from "@connectapp/db";
import { Avatar } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { PortalShell, PortalTitle, Panel } from "@/components/portal-shell";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * R17.2. A member's own household.
 *
 * Reading rather than editing: changing a name or an address is a question for
 * the church office. What the directory publishes is settled on the profile,
 * where a member changes or clears the field itself.
 */
export default async function MyHouseholdPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  if (canEditPeople(session) || canReadIncidents(session)) {
    redirect(`/members?church=${session.tenantSlug}`);
  }

  const mine = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => {
      const self = await personForUser(tx, session.userId);
      if (!self) return null;
      return { household: await householdFor(tx, self) };
    },
  );

  if (!mine) {
    return (
      <PortalShell session={session}>
        <PortalTitle title={t("nav.myHousehold")} />
        <p className="text-[length:var(--d-text-body)] text-fg-muted">
          {t("member.error.noRecord")}
        </p>
      </PortalShell>
    );
  }


  return (
    <PortalShell session={session}>
      <PortalTitle title={t("nav.myHousehold")} />

      <div className="flex flex-wrap items-start gap-6">
        <Panel className="flex min-w-0 flex-1 flex-col gap-3">
          <span className="font-semibold text-fg">{t("home.people")}</span>
          {mine.household ? (
            mine.household.members.map((one) => (
              <span key={one.id} className="flex items-center gap-3">
                <Avatar
                  name={one.displayName}
                  id={one.id}
                  size="sm"
                  className="size-9 text-[12px] font-semibold"
                />
                <span className="flex min-w-0 flex-1 flex-col leading-5">
                  <span className="truncate font-medium text-fg">{one.displayName}</span>
                  <span className="truncate text-caption text-fg-subtle">
                    {t(`householdRole.${one.role}` as never)}
                  </span>
                </span>
              </span>
            ))
          ) : (
            <p className="text-[length:var(--d-text-body)] text-fg-muted">
              {t("home.noHousehold")}
            </p>
          )}
        </Panel>

      </div>
    </PortalShell>
  );
}
