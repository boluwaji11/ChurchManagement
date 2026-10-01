import {
  withTenant, listOccurrences, topUpCalendar, countsFor, getChurch, canManageServices,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { Calendar } from "./calendar";
import { churchNow, hasHappened } from "@/lib/church-now";
import { MonthBar } from "./month";
import { ViewBar } from "./views";
import { isView } from "./view";

export const dynamic = "force-dynamic";

const readableDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

const readableTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
};

/** "2026-09" to the first and last day of that month. */
function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y!, m!, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

const shiftMonth = (month: string, by: number): string => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y!, m! - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const isMonth = (value: string | undefined): value is string => /^\d{4}-\d{2}$/.test(value ?? "");

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; month?: string; view?: string }>;
}) {
  const { church, month: asked, view: askedView } = await searchParams;
  const view = isView(askedView) ? askedView : "calendar";
  const session = await requireSession(church);

  const { rows, present, timezone, month, thisMonth } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      // Keeps a repeating service six months ahead without anybody maintaining
      // a calendar. Idempotent, and it does nothing for a church with none.
      if (canManageServices(session.role)) {
        await topUpCalendar(tx, { tenantId: session.tenantId, role: session.role });
      }
      const profile = await getChurch(tx, session.tenantId);
      const zone = profile?.timezone ?? "America/Chicago";
      const zoneNow = churchNow(zone);
      const month = isMonth(asked) ? asked : zoneNow.date.slice(0, 7);
      const range = monthRange(month);
      const list = await listOccurrences(tx, { ...range, includeCancelled: true });

      return {
        rows: list,
        present: await countsFor(tx, list.map((r) => r.id)),
        timezone: zone,
        month,
        thisMonth: zoneNow.date.slice(0, 7),
      };
    },
  );

  const now = churchNow(timezone);

  return (
    <>
      <AppHeader session={session} />
      <main id="main" className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <PageTitle title={t("services.title")} />

        <Calendar
          church={session.tenantSlug}
          canEdit={canManageServices(session.role)}
          view={view}
          month={month}
          today={now.date}
          nowTime={now.time}
          monthBar={
            <MonthBar
              church={session.tenantSlug}
              month={month}
              label={new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, {
                month: "long", year: "numeric",
              })}
              previous={shiftMonth(month, -1)}
              next={shiftMonth(month, 1)}
              isThisMonth={month === thisMonth}
              view={view}
            />
          }
          viewBar={<ViewBar church={session.tenantSlug} month={month} view={view} />}
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
            frequency: r.frequency,
            readableDate: readableDate(r.occursOn),
            readableTime: readableTime(r.startsAt),
          }))}
        />

      </main>
    </>
  );
}
