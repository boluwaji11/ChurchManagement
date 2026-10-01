import {
  withTenant, listStations, listRooms, listOccurrences, getChurch, canManageStations,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { AppHeader } from "@/components/app-header";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { StationPicker } from "./station-picker";

export const dynamic = "force-dynamic";

/** "09:00" as a church says it. */
const readableTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
};

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

  const { stations, rooms, services, now } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const profile = await getChurch(tx, session.tenantId);
      const today = churchNow(profile?.timezone ?? "America/Chicago").date;
      return {
        now: churchNow(profile?.timezone ?? "America/Chicago").time,
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
      <main id="main" className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <PageTitle title={t("checkin.title")} />
        <StationPicker
          church={session.tenantSlug}
          now={now}
          canManage={canManageStations(session.role)}
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
              .map((o) => ({
                id: o.id,
                name: o.name,
                startsAt: o.startsAt,
                readableTime: readableTime(o.startsAt),
              })),
          }))}
        />
      </main>
    </>
  );
}
