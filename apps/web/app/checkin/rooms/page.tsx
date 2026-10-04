import { withTenant, listOccurrences, getChurch, canSupervise } from "@hearth/db";
import { Banner } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { RoomBoard } from "./board";

export const dynamic = "force-dynamic";

/** "09:00" as a church says it. */
const readableTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
};

/**
 * R8.17 to R8.19. Children's ministry on one screen.
 *
 * Separate from the desk on purpose. The desk is a queue and belongs to whoever
 * is standing at it; this is the person walking the corridor, who needs every
 * room at once and types nothing.
 */
export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  const { services, now, today } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const profile = await getChurch(tx, session.tenantId);
      const clock = churchNow(profile?.timezone ?? "America/Chicago");
      return {
        now: clock.time,
        today: clock.date,
        services: await listOccurrences(tx, { from: clock.date, to: clock.date }),
      };
    },
  );

  return (
    <AppShell
      session={session}
      title={t("board.title")}
    >
      {canSupervise(session.role) ? (
        <RoomBoard
          church={session.tenantSlug}
          now={now}
          today={today}
          initial={null}
          rosters={{}}
          services={services
            .filter((o) => o.status === "scheduled")
            .map((o) => ({
              id: o.id,
              name: o.name,
              startsAt: o.startsAt,
              readableTime: readableTime(o.startsAt),
            }))}
        />
      ) : (
        <Banner tone="info" title={t("board.title")}>{t("forbidden.askAdmin")}</Banner>
      )}
    </AppShell>
  );
}
