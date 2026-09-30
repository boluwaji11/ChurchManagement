import { withTenant, listStations, listRooms, listOccurrences, getChurch } from "@hearth/db";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { AppHeader } from "@/components/app-header";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { StationPicker } from "./station-picker";

export const dynamic = "force-dynamic";

/**
 * R8.2. Which station this device is.
 *
 * The configuration is the station's and the choice is the device's, so a
 * tablet that dies on a Sunday morning is replaced by pointing another one at
 * the same station.
 */
export default async function CheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  const { stations, rooms, services } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const profile = await getChurch(tx, session.tenantId);
      const today = churchNow(profile?.timezone ?? "America/Chicago").date;
      return {
        stations: await listStations(tx),
        rooms: await listRooms(tx),
        // Today's, because a station is a thing somebody stands at on the day.
        services: await listOccurrences(tx, { from: today, to: today }),
      };
    },
  );

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <PageTitle title={t("checkin.title")} lede={session.tenantName} />
        <StationPicker
          church={session.tenantSlug}
          stations={stations.map((s) => ({
            id: s.id,
            name: s.name,
            mode: s.mode,
            printer: s.printer,
            rooms: (s.roomIds.length === 0 ? rooms : rooms.filter((r) => s.roomIds.includes(r.id)))
              .map((r) => ({ id: r.id, name: r.name, hue: r.hue, capacity: r.capacity })),
            services: services
              .filter(
                (o) =>
                  o.status === "scheduled" &&
                  (s.serviceTimeIds.length === 0 ||
                    (o.serviceTimeId !== null && s.serviceTimeIds.includes(o.serviceTimeId))),
              )
              .map((o) => ({ id: o.id, name: o.name, startsAt: o.startsAt })),
          }))}
        />
      </main>
    </>
  );
}
