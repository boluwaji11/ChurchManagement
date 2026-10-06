import { redirect } from "next/navigation";
import {
  withTenant, personForUser, householdFor, canEditPeople, canReadIncidents,
} from "@connectapp/db";
import { Avatar } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";

export const dynamic = "force-dynamic";

/**
 * R17.2. A member's own household, inside their settings.
 *
 * Reading rather than editing: changing a name or an address is a question for
 * the church office. What the directory publishes is settled on the profile,
 * where a member changes or clears the field itself.
 *
 * It sits here rather than on a screen of its own, because the menu it is
 * reached from is the settings menu, and a press that takes somebody out of the
 * screen they are in reads as having gone wrong.
 */
export default async function MyHouseholdPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  if (canEditPeople(session) || canReadIncidents(session)) {
    redirect(`/settings/households?church=${session.tenantSlug}`);
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

  return (
    <>
      <SettingsHeading title="settings.tab.household" />

      {!mine ? (
        <p className="text-[length:var(--d-text-body)] text-fg-muted">
          {t("member.error.noRecord")}
        </p>
      ) : mine.household ? (
        <section className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface px-5 py-4">
          {mine.household.members.map((one) => (
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
          ))}
        </section>
      ) : (
        <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("home.noHousehold")}</p>
      )}
    </>
  );
}
