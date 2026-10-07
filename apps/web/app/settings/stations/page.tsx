import { withTenant, listStations, canManageStations } from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { SettingsHeading } from "../heading";
import { StationManager } from "./station-manager";
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
  return tabMetadata(t("settings.tab.stations"), church);
}

export default async function StationsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  const { stations } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => ({
      stations: await listStations(tx, { includeArchived: true }),
    }),
  );

  if (!canManageStations(session)) {
    return <Denied />;
  }

  return (
    <>
      <SettingsHeading title="settings.tab.stations" lede="settings.lede.stations" />
      <StationManager
        church={session.tenantSlug}
        stations={stations.map((s) => ({
          id: s.id,
          name: s.name,
          mode: s.mode,
          printer: s.printer,
          archived: s.archivedAt !== null,
        }))}
      />
    </>
  );
}
