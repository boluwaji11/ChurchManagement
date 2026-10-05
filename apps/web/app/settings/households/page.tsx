import { withTenant, listHouseholdRows, canManageHouseholds } from "@connectapp/db";
import { Banner } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { Empty } from "@/components/empty";
import { SettingsHeading } from "../heading";
import { HouseholdList, NewHousehold } from "./households";

export const dynamic = "force-dynamic";

/** R2.1. The families a church keeps together, as things in their own right. */
export default async function HouseholdsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canManageHouseholds(session)) {
    return (
      <Banner tone="info" title={t("households.forbidden.title")}>
        {t("forbidden.askAdmin")}
      </Banner>
    );
  }

  const rows = await withTenant(
    { tenantId: session.tenantId, role: session.role, permissions: session.permissions },
    (tx) => listHouseholdRows(tx, { includeArchived: true }),
  );

  return (
    <>
      <SettingsHeading
        title="settings.tab.households"
        lede="settings.lede.households"
        action={rows.length > 0 ? <NewHousehold church={session.tenantSlug} /> : undefined}
      />

      {rows.length === 0 ? (
        <Empty
          icon="members"
          title={t("households.empty.title")}
          body={t("households.empty.body")}
          action={<NewHousehold church={session.tenantSlug} />}
        />
      ) : (
        <HouseholdList church={session.tenantSlug} households={rows} />
      )}
    </>
  );
}
