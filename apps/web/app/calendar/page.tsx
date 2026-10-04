import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  withTenant, getChurch, listOccurrences, listGroups, canManageServices,
} from "@hearth/db";
import { upcomingMeetings } from "@hearth/db/rules";
import { Banner } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";

export const dynamic = "force-dynamic";

/**
 * R15.1. The week, with everything the church has on it.
 *
 * Built from what the church already holds rather than from a calendar table:
 * the services it has scheduled and the pattern each group meets on. Room
 * booking and outside requests are the rest of F15 and are not here yet.
 */

const ISO = /^\d{4}-\d{2}-\d{2}$/;

const shift = (iso: string, days: number): string => {
  const at = new Date(`${iso}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
};

/** The Monday on or before a date, because a church week is read Monday first. */
const weekStart = (iso: string): string => {
  const at = new Date(`${iso}T00:00:00Z`);
  return shift(iso, -((at.getUTCDay() + 6) % 7));
};

const dayName = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });

const dayNumber = (iso: string) => new Date(`${iso}T00:00:00`).getUTCDate();

const span = (from: string, to: string) =>
  `${new Date(`${from}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long" })}`
  + ` to ${new Date(`${to}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long" })}`;

const clock = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const at = new Date();
  at.setHours(h ?? 0, m ?? 0, 0, 0);
  return at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
};

interface Entry {
  id: string;
  title: string;
  detail: string;
  hue: string;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; at?: string }>;
}) {
  const params = await searchParams;
  const session = await requireSession(params.church);

  if (!canManageServices(session)) {
    return (
      <AppShell session={session} title={t("calendar.title")}>
        <Banner tone="info" title={t("calendar.title")}>{t("forbidden.askAdmin")}</Banner>
      </AppShell>
    );
  }

  const { days, from, to, today } = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    async (tx) => {
      const profile = await getChurch(tx, session.tenantId);
      const now = churchNow(profile?.timezone ?? "America/Chicago").date;
      const asked = params.at && ISO.test(params.at) ? params.at : now;
      const start = weekStart(asked);
      const end = shift(start, 6);

      const occurrences = await listOccurrences(tx, { from: start, to: end });
      const groups = await listGroups(tx);
      const brand = profile?.brandHue ?? "indigo";

      const dates = Array.from({ length: 7 }, (_, i) => shift(start, i));

      return {
        from: start,
        to: end,
        today: now,
        days: dates.map((date) => {
          const entries: Entry[] = occurrences
            .filter((o) => o.occursOn === date)
            .map((o) => ({
              id: o.id,
              title: o.name,
              detail: clock(o.startsAt),
              hue: brand,
            }));

          for (const group of groups) {
            // R9.2. Worked out from the pattern rather than stored, which is
            // why a church that meets "Tuesdays" has to write it only once.
            const meets = upcomingMeetings(
              { dayOfWeek: group.dayOfWeek, frequency: group.frequency },
              date,
              1,
            );
            if (meets[0] !== date) continue;
            entries.push({
              id: `${group.id}-${date}`,
              title: group.name,
              detail: [group.startsAt ? clock(group.startsAt) : null, group.location]
                .filter(Boolean)
                .join(" · "),
              hue: group.typeHue ?? "fern",
            });
          }

          return { date, entries };
        }),
      };
    },
  );

  const link = (at: string) =>
    `/calendar?church=${session.tenantSlug}&at=${at}`;

  return (
    <AppShell session={session} title={t("calendar.title")} wide>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="mr-1.5 font-display text-[22px] leading-7 text-fg">
            {span(from, to)}
          </span>
          <Link
            href={link(shift(from, -7))}
            aria-label={t("calendar.earlier")}
            className="grid size-8 place-items-center rounded-sm border border-line-strong bg-surface"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
          {/* The dot between the arrows comes back to the week we are in. */}
          <Link
            href={link(today)}
            aria-label={t("calendar.now")}
            className="grid size-8 place-items-center rounded-sm border border-line-strong bg-surface"
          >
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ background: from === weekStart(today) ? "var(--color-fg)" : "var(--color-fg-subtle)" }}
            />
          </Link>
          <Link
            href={link(shift(from, 7))}
            aria-label={t("calendar.later")}
            className="grid size-8 place-items-center rounded-sm border border-line-strong bg-surface"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="grid overflow-auto rounded-lg border border-line [grid-template-columns:repeat(7,minmax(120px,1fr))]">
        {days.map((day) => (
          <section
            key={day.date}
            className={`border-r border-line p-2 last:border-r-0 ${
              day.date === today ? "bg-sunken" : "bg-surface"
            }`}
          >
            <div className="flex items-baseline gap-1.5 border-b border-line px-1 pt-1 pb-2.5">
              <span className="text-[12px] font-medium text-fg-subtle">{dayName(day.date)}</span>
              <span className="font-display text-[20px] text-fg">{dayNumber(day.date)}</span>
            </div>

            <div className="flex min-h-[200px] flex-col gap-1.5 pt-2">
              {day.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-sm px-2.5 py-2"
                  style={{
                    background: `var(--hue-${entry.hue}-tint)`,
                    borderLeft: `3px solid var(--hue-${entry.hue}-500)`,
                  }}
                >
                  <div
                    className="text-[13px] font-medium"
                    style={{ color: `var(--hue-${entry.hue}-key)` }}
                  >
                    {entry.title}
                  </div>
                  {entry.detail ? (
                    <div className="text-[12px] text-fg-muted">{entry.detail}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
