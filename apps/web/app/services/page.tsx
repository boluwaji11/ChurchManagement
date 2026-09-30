import {
  withTenant, listOccurrences, topUpCalendar, countsFor, getChurch, canManageServices,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { Calendar } from "./calendar";
import { churchNow, hasHappened } from "@/lib/church-now";

export const dynamic = "force-dynamic";

const readableDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

const readableTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  const { rows, present, timezone } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      // Keeps a repeating service six months ahead without anybody maintaining
      // a calendar. Idempotent, and it does nothing for a church with none.
      if (canManageServices(session.role)) {
        await topUpCalendar(tx, { tenantId: session.tenantId, role: session.role });
      }
      const list = await listOccurrences(tx, { includeCancelled: true });
      const church = await getChurch(tx, session.tenantId);
      const zone = church?.timezone ?? "America/Chicago";
      return {
        rows: list,
        present: await countsFor(tx, list.map((r) => r.id)),
        timezone: zone,
      };
    },
  );

  const now = churchNow(timezone);

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <PageTitle title={t("services.title")} lede={session.tenantName} />

        <Calendar
          church={session.tenantSlug}
          canEdit={canManageServices(session.role)}
          rows={rows.map((r) => ({
            id: r.id,
            name: r.name,
            occursOn: r.occursOn,
            startsAt: r.startsAt,
            status: r.status,
            note: r.note,
            special: r.serviceTimeId === null,
            adults: r.countAdults,
            children: r.countChildren,
            visitors: r.countVisitors,
            total:
              r.countAdults === null && r.countChildren === null && r.countVisitors === null
                ? null
                : (r.countAdults ?? 0) + (r.countChildren ?? 0) + (r.countVisitors ?? 0),
            past: hasHappened(now, r.occursOn, r.startsAt),
            present: present[r.id] ?? 0,
            serviceTimeId: r.serviceTimeId,
            readableDate: readableDate(r.occursOn),
            readableTime: readableTime(r.startsAt),
          }))}
        />

      </main>
    </>
  );
}
