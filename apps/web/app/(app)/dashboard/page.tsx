import { Suspense } from "react";
import { GripVertical } from "lucide-react";
import {
  withTenant, dashboard, attendanceByService, openFollowUps,
  listOccurrences, listGroups, listEvents,
  canEditPeople, canReadIncidents,
} from "@connectapp/db";
import { upcomingMeetings } from "@connectapp/db/rules";
import { Skeleton } from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { Screen } from "@/components/screen";
import { requireScreen, shellData } from "@/lib/shell-data";
import { Denied } from "@/components/denied";
import type { Session } from "@/lib/session";
import { churchNow, hasHappened } from "@/lib/church-now";
import { shortDate } from "@/lib/dates";
import { Tiles, type Tile } from "./tiles";
import { Weeks } from "./weeks";
import { ThisWeek, type WeekEntry } from "./this-week";
import { FollowUp } from "./follow-up";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  return tabMetadata(t("dashboard.title"));
}

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
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  const session = await requireScreen();

  // Somebody who is not staff has their own screen, and this is not it.
  if (!canEditPeople(session) && !canReadIncidents(session)) {
    return (
      <Denied role={session.role} action="readPeople" church={session.tenantSlug} />
    );
  }

  /*
   * R24.11. The frame goes to the browser now and the board arrives after it.
   *
   * Everything below was previously awaited before any output was sent, so a
   * church on a slow connection saw nothing until the last query returned. The
   * shell is rendered by the screen rather than by a layout, so a loading.tsx
   * here would replace the frame as well and the whole page would flash. A
   * boundary inside the frame keeps the navigation and the church's name on
   * screen and streams only the board.
   */
  return (
    <Screen wide>
      <Suspense fallback={<BoardSkeleton />}>
        <Board session={session} />
      </Suspense>
    </Screen>
  );
}

/** R24.6. The board's own shape, while it is being read. */
function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {[0, 1, 2, 3].map((one) => (
          <Skeleton key={one} className="h-[104px] rounded-[14px]" />
        ))}
      </div>
      <Skeleton className="h-[240px] rounded-[14px]" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
        <Skeleton className="h-[200px] rounded-[14px]" />
        <Skeleton className="h-[200px] rounded-[14px]" />
      </div>
    </div>
  );
}

async function Board({ session }: { session: Session }) {
  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  /*
   * The frame around this screen has already read the church, and the clock
   * this page runs on comes out of it. Reading it again was a second trip for
   * a timezone.
   */
  const profile = (await shellData(session)).church;
  const clockNow = churchNow(profile?.timezone ?? "America/Chicago");

  const { numbers, weeks, tasks, week, next, now } = await withTenant(ctx, async (tx) => {
    const today = clockNow.date;
    const until = shift(today, AHEAD);
    const brand = profile?.brandHue ?? "indigo";

    /*
     * Six independent reads previously ran in sequence, one round trip each.
     * They are issued together on the one connection.
     */
    const [occurrences, groups, published, counts, byService, followUps] =
      await Promise.all([
        listOccurrences(tx, { from: today, to: until }),
        listGroups(tx),
        listEvents(tx),
        dashboard(tx, today),
        attendanceByService(tx, { from: shift(today, -WEEKS * 7), to: today }),
        openFollowUps(tx, 5),
      ]);
    const events = published.filter((one) => one.status === "published");

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
      numbers: counts,
      weeks: byService,
      tasks: followUps,
      week: entries,
      // The next service, which is what the date line reports.
      next: occurrences.find((one) => !hasHappened(clockNow, one.occursOn, one.startsAt)) ?? null,
    };
  });

  const last = numbers.lastService;
  const delta = last && last.average > 0 ? last.present - last.average : null;

  /*
   * R18.1. What a number is doing, beside the number.
   *
   * A tile that says 227 says nothing a church can act on. The stretch it is
   * measured against is the same stretch of the month before, so a church
   * three days into October is not read against all of September.
   */
  const since = (now: number, before: number, key: "dashboard.onLastMonth" | "dashboard.onPreviousMonth") => {
    const change = now - before;
    if (before === 0) return null;
    if (change === 0) return t("dashboard.sameAsLastMonth");
    return t(key, { delta: `${change > 0 ? "+" : ""}${change}` });
  };

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
      sub:
        since(numbers.newThisMonth, numbers.newByNowLastMonth, "dashboard.onLastMonth")
        ?? t("dashboard.thisMonth"),
      hue: "indigo",
    },
    {
      id: "visitors",
      label: t("dashboard.visitors"),
      value: String(numbers.visitors.total),
      sub:
        numbers.visitors.uncontacted > 0
          ? plural("dashboard.uncontacted", numbers.visitors.uncontacted)
          : since(numbers.visitors.total, numbers.visitors.before, "dashboard.onPreviousMonth")
            ?? t("dashboard.allContacted"),
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
    <>
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
        {/* The tiles are dragged with a pointer, and a phone has none. */}
        <p className="hidden items-center gap-1.5 text-caption text-fg-subtle sm:flex">
          <GripVertical className="size-3.5" aria-hidden />
          {t("dashboard.reorder")}
        </p>
      </div>

      {/* R18.1. The numbers, whatever they say. A church at nought is a church
          that can see where its own screen will fill in, and the order of them
          is this reader's to set from the first day. */}
      <Tiles church={session.tenantSlug} tiles={tiles} />

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
        {/* R18.2. What has been happening, which is the question the number
            above cannot answer on its own. */}
        <Weeks services={weeks} today={now.date} />
        <ThisWeek entries={week} />
        <FollowUp today={now.date} entries={tasks} />
      </div>
    </>
  );
}