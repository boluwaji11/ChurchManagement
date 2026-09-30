import { withTenant, listStations, listRooms, listServiceTimes, canManageStations } from "@hearth/db";
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

  const { stations, rooms, services } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => ({
      stations: await listStations(tx, { includeArchived: true }),
      rooms: await listRooms(tx),
      services: await listServiceTimes(tx),
    }),
  );

  if (!canManageStations(session.role)) {
    return <Banner tone="info" title={t("stations.title")}>{t("forbidden.askAdmin")}</Banner>;
  }

  return (
    <StationManager
      church={session.tenantSlug}
      rooms={rooms.map((r) => ({ id: r.id, name: r.name, hue: r.hue }))}
      services={services.map((s) => ({ id: s.id, name: s.name }))}
      stations={stations.map((s) => ({
        id: s.id,
        name: s.name,
        mode: s.mode,
        printer: s.printer,
        roomIds: s.roomIds,
        serviceTimeIds: s.serviceTimeIds,
        archived: s.archivedAt !== null,
      }))}
    />
  );
}
