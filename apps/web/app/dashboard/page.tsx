import { redirect } from "next/navigation";
import { GripVertical } from "lucide-react";
import {
  withTenant, getChurch, dashboard, attendanceByService, openFollowUps, setupProgress,
  listOccurrences, listGroups, listEvents,
  canEditPeople, canReadIncidents,
} from "@hearth/db";
import { upcomingMeetings } from "@hearth/db/rules";
import { t, plural } from "@hearth/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow, hasHappened } from "@/lib/church-now";
import { shortDate } from "@/lib/dates";
import { SetupChecklist } from "./checklist";
import { Tiles, type Tile } from "./tiles";
import { Weeks } from "./weeks";
import { ThisWeek, type WeekEntry } from "./this-week";
import { FollowUp } from "./follow-up";

export const dynamic = "force-dynamic";

/** How far back the line of weeks reads. */
const WEEKS = 12;

/** How far ahead the week panel looks. */
const AHEAD = 7;

/** The same date, a number of days later, as YYYY-MM-DD. */
function shift(iso: string, days: number): string {
  const at = new Date(`${iso}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
}

const dayName = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });

const longDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long",
  });

const clock = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const at = new Date();
  at.setHours(h ?? 0, m ?? 0, 0, 0);
  return at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
};

/** What the hour of the day is called where the church is. */
function partOfDay(time: string): "morning" | "afternoon" | "evening" {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

/**
 * R18.1, R22.1. The screen a church opens the week on.
 *
 * What is left to set up, four numbers, and the three things a church actually
 * does on a Monday: look at where attendance is going, look at what is on this
 * week, and answer the follow-ups nobody has answered. Everything here is
 * counted from the record when it is asked for, so a church can trust it enough
 * to act on it.
 *
 * No money. That work is deferred, and a dashboard with a blank where the
 * giving should be is worse than a dashboard without it.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  // Somebody who is not staff has their own screen, and this is not it.
  if (!canEditPeople(session) && !canReadIncidents(session)) {
    redirect(`/home?church=${session.tenantSlug}`);
  }

  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const { numbers, weeks, setup, tasks, week, next, now } = await withTenant(ctx, async (tx) => {
    const profile = await getChurch(tx, session.tenantId);
    const clockNow = churchNow(profile?.timezone ?? "America/Chicago");
    const today = clockNow.date;
    const until = shift(today, AHEAD);
    const brand = profile?.brandHue ?? "indigo";

    const occurrences = await listOccurrences(tx, { from: today, to: until });
    const groups = await listGroups(tx);
    const events = (await listEvents(tx)).filter((one) => one.status === "published");

    const entries: WeekEntry[] = [];
    for (let i = 0; i <= AHEAD; i += 1) {
      const date = shift(today, i);

      for (const one of occurrences.filter((o) => o.occursOn === date)) {
        entries.push({
          id: one.id,
          day: dayName(date),
          title: one.name,
          time: clock(one.startsAt),
          hue: brand,
        });
      }

      for (const one of events) {
        const last = one.endsOn ?? one.startsOn;
        if (date < one.startsOn || date > last) continue;
        entries.push({
          id: `${one.id}-${date}`,
          day: dayName(date),
          title: one.name,
          time: date === one.startsOn && one.startsAt ? clock(one.startsAt) : "",
          hue: one.hue,
          href: `/events/${one.slug}`,
        });
      }

      for (const group of groups) {
        // R9.2. Worked out from the pattern rather than stored, which is why a
        // church that meets "Tuesdays" has to write it only once.
        const meets = upcomingMeetings(
          { dayOfWeek: group.dayOfWeek, frequency: group.frequency },
          date,
          1,
        );
        if (meets[0] !== date) continue;
        entries.push({
          id: `${group.id}-${date}`,
          day: dayName(date),
          title: group.name,
          time: group.startsAt ? clock(group.startsAt) : "",
          hue: group.typeHue ?? "fern",
          href: `/groups/${group.slug}`,
        });
      }
    }

    return {
      now: clockNow,
      numbers: await dashboard(tx, today),
      weeks: await attendanceByService(tx, { from: shift(today, -WEEKS * 7), to: today }),
      setup: await setupProgress(tx, session.tenantId),
      tasks: await openFollowUps(tx, 5),
      week: entries,
      // The service the church is heading towards, which is the one thing
      // worth saying beside today's date.
      next: occurrences.find((one) => !hasHappened(clockNow, one.occursOn, one.startsAt)) ?? null,
    };
  });

  const last = numbers.lastService;
  const delta = last && last.average > 0 ? last.present - last.average : null;

  const tiles: Tile[] = [
    {
      id: "attendance",
      label: t("dashboard.attendance"),
      value: last ? String(last.present) : "0",
      /*
       * The comparison where there is one. A church with a single service on
       * the record has nothing to compare against, so it reads the day it was
       * held rather than being told no attendance was recorded under a number
       * that plainly was.
       */
      sub: last
        ? delta === null
          ? `${last.name} \u00b7 ${shortDate(last.occursOn)}`
          : t("dashboard.againstAverage", { delta: `${delta > 0 ? "+" : ""}${delta}` })
        : t("dashboard.noAttendance"),
      hue: "violet",
    },
    {
      id: "new-members",
      label: t("dashboard.newPeople"),
      value: String(numbers.newThisMonth),
      sub: t("dashboard.thisMonth"),
      hue: "indigo",
    },
    {
      id: "visitors",
      label: t("dashboard.visitors"),
      value: String(numbers.visitors.total),
      sub:
        numbers.visitors.uncontacted > 0
          ? plural("dashboard.uncontacted", numbers.visitors.uncontacted)
          : t("dashboard.allContacted"),
      hue: "amber",
    },
    {
      id: "follow-ups",
      label: t("dashboard.followUps"),
      value: String(numbers.followUps.open),
      sub:
        numbers.followUps.overdue > 0
          ? plural("dashboard.overdue", numbers.followUps.overdue)
          : t("dashboard.noneOverdue"),
      hue: numbers.followUps.overdue > 0 ? "rose" : "teal",
    },
  ];

  // What to call them. Their first name, because the screen is theirs.
  const who = session.displayName.split(" ")[0] ?? session.displayName;

  return (
    <AppShell session={session} title={t("dashboard.title")} wide>
      {/* R22.1. Here while there is something left to do, and gone afterwards
          rather than sitting in the settings of a church that finished in
          March. */}
      {!setup.complete && !setup.dismissed ? (
        <SetupChecklist
          church={session.tenantSlug}
          churchName={session.tenantName}
          progress={setup}
        />
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[32px] leading-[38px] text-fg">
            {t(`dashboard.greeting.${partOfDay(now.time)}` as never, { name: who })}
          </h2>
          <p className="mt-1 text-fg-muted">
            {[
              longDay(now.date),
              next
                ? t("dashboard.doorsOpen", {
                    day: new Date(`${next.occursOn}T00:00:00`).toLocaleDateString(undefined, {
                      weekday: "long",
                    }),
                    time: clock(next.startsAt),
                  })
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <p className="flex items-center gap-1.5 text-caption text-fg-subtle">
          <GripVertical className="size-3.5" aria-hidden />
          {t("dashboard.reorder")}
        </p>
      </div>

      <Tiles church={session.tenantSlug} tiles={tiles} />

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
        {/* R18.2. What has been happening, which is the question the number
            above cannot answer on its own. */}
        <Weeks services={weeks} today={now.date} />
        <ThisWeek church={session.tenantSlug} entries={week} />
        <FollowUp church={session.tenantSlug} today={now.date} entries={tasks} />
      </div>
    </AppShell>
  );
}
