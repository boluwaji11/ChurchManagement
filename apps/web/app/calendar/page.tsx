import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  withTenant, getChurch, listOccurrences, listEvents,
  canManageServices,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { Denied } from "@/components/denied";

export const dynamic = "force-dynamic";

/**
 * R15.1. The week, with what the church has on it.
 *
 * Built from what the church already holds rather than from a calendar table:
 * the services it has scheduled and the events it has published. A group meets
 * on a pattern rather than on a date, and thirty of them filled every column
 * here, so a group's own page is where its meetings read. Room booking and
 * outside requests are the rest of F15 and are not here yet.
 */

const ISO = /^\d{4}-\d{2}-\d{2}$/;

const shift = (iso: string, days: number): string => {
  const at = new Date(`${iso}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
};

/** How many days the calendar shows: this week and the one after it. */
const SPAN = 14;

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
  /** R24.6. Where the thing on this day lives, where it has a page. */
  href?: string;
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
        <Denied />
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
      const end = shift(start, SPAN - 1);

      const occurrences = await listOccurrences(tx, { from: start, to: end });
      /*
       * R14.1, R15.1. Published events, so a camp is on the week it runs the
       * moment the church publishes it. Drafts stay off: the calendar is what
       * the church has on, and a draft is not yet something it has on.
       */
      const events = (await listEvents(tx)).filter((one) => one.status === "published");
      const brand = profile?.brandHue ?? "indigo";

      const dates = Array.from({ length: SPAN }, (_, i) => shift(start, i));

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
              href: `/services/${o.slug}/plan`,
            }));

          for (const one of events) {
            // An event runs from its first day to its last, so a camp appears
            // on each of the three days rather than only on the Friday.
            const last = one.endsOn ?? one.startsOn;
            if (date < one.startsOn || date > last) continue;

            entries.push({
              id: `${one.id}-${date}`,
              title: one.name,
              detail: [
                date === one.startsOn && one.startsAt ? clock(one.startsAt) : null,
                one.location,
              ]
                .filter(Boolean)
                .join(" \u00b7 "),
              hue: one.hue,
              href: `/events/${one.slug}`,
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
            href={link(shift(from, -SPAN))}
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
            href={link(shift(from, SPAN))}
            aria-label={t("calendar.later")}
            className="grid size-8 place-items-center rounded-sm border border-line-strong bg-surface"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="grid overflow-auto rounded-lg border border-line [grid-template-columns:repeat(7,minmax(120px,1fr))]">
        {days.map((day, at) => (
          <section
            key={day.date}
            className={`border-line p-2 ${at % 7 === 6 ? "" : "border-r"} ${
              at < 7 ? "border-b" : ""
            } ${day.date === today ? "bg-sunken" : "bg-surface"}`}
          >
            <div className="flex items-baseline gap-1.5 border-b border-line px-1 pt-1 pb-2.5">
              <span className="text-[12px] font-medium text-fg-subtle">{dayName(day.date)}</span>
              <span className="font-display text-[20px] text-fg">{dayNumber(day.date)}</span>
            </div>

            <div className="flex min-h-[150px] flex-col gap-1.5 pt-2">
              {day.entries.map((entry) => {
                const body = (
                  <>
                    <div
                      className="text-[13px] font-medium"
                      style={{ color: `var(--hue-${entry.hue}-key)` }}
                    >
                      {entry.title}
                    </div>
                    {entry.detail ? (
                      <div className="text-[12px] text-fg-muted">{entry.detail}</div>
                    ) : null}
                  </>
                );

                const style = {
                  background: `var(--hue-${entry.hue}-tint)`,
                  borderLeft: `3px solid var(--hue-${entry.hue}-500)`,
                };

                // R24.6. A tile that stands for something with a page opens it.
                return entry.href ? (
                  <Link
                    key={entry.id}
                    href={`${entry.href}?church=${session.tenantSlug}`}
                    className="group block cursor-pointer rounded-sm px-2.5 py-2 outline-none transition-all hover:-translate-y-px hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary"
                    style={style}
                  >
                    {body}
                  </Link>
                ) : (
                  <div key={entry.id} className="rounded-sm px-2.5 py-2" style={style}>
                    {body}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
