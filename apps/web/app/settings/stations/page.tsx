import { withTenant, listStations, canManageStations } from "@hearth/db";
import { Banner } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { StationManager } from "./station-manager";

export const dynamic = "force-dynamic";

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

  if (!canManageStations(session.role)) {
    return <Banner tone="info" title={t("stations.title")}>{t("forbidden.askAdmin")}</Banner>;
  }

  return (
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
  );
}
