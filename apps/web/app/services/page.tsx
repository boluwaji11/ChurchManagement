import {
  withTenant, listOccurrences, topUpCalendar, planSummaries, getChurch, canManageServices,
} from "@connectapp/db";
import { Empty } from "@/components/empty";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { churchNow } from "@/lib/church-now";
import { AddService } from "./add-service";
import { ServiceBoard, type ServiceCard } from "./board";

export const dynamic = "force-dynamic";

/** How far ahead the screen reads. A church plans a few weeks, not a year. */
const AHEAD_DAYS = 70;

/** How far back it looks for the two it shows down the right. */
const PAST_DAYS = 60;

const readableDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "short",
  });

const readableTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const at = new Date();
  at.setHours(h ?? 0, m ?? 0, 0, 0);
  return at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
};

const shift = (iso: string, days: number): string => {
  const at = new Date(`${iso}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
};

/**
 * R11.1. What is coming, and what each one has planned.
 *
 * A card a service, in the order they happen, with the two numbers that say
 * whether anybody has done anything about it yet. Opening one goes to its
 * order of service, which is what a church came here to write.
 */
/**
 * R11.1. How long after it starts a service is still the one to look at.
 *
 * A church mid-service should still see this morning under "upcoming", and at
 * eleven at night it should be behind them. There is no recorded finish, so
 * three hours stands in for one.
 */
const RUNS_FOR_HOURS = 3;

const hasBeen = (one: { occursOn: string; startsAt: string }, today: string, time: string) => {
  if (one.occursOn < today) return true;
  if (one.occursOn > today) return false;
  const [h = 0, m = 0] = one.startsAt.split(":").map(Number);
  const ends = String(h + RUNS_FOR_HOURS).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  return time > ends;
};


export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  const canEdit = canManageServices(session);

  const { rows, past, plans, now } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      // Keeps a repeating service some weeks ahead without anybody maintaining
      // a calendar. Idempotent, and it does nothing for a church with none.
      if (canEdit) {
        await topUpCalendar(tx, { tenantId: session.tenantId, role: session.role });
      }

      const profile = await getChurch(tx, session.tenantId);
      const clock = churchNow(profile?.timezone ?? "America/Chicago");
      const list = await listOccurrences(tx, {
        from: clock.date,
        to: shift(clock.date, AHEAD_DAYS),
      });

      // R11.1. What was last held, so a plan can be copied from the week
      // before without hunting for it.
      const before = (
        await listOccurrences(tx, { from: shift(clock.date, -PAST_DAYS), to: clock.date })
      ).filter((one) => one.occursOn < clock.date).slice(0, 2);

      return {
        now: clock,
        rows: list,
        past: before,
        plans: await planSummaries(tx, [...list, ...before].map((one) => one.id)),
      };
    },
  );

  // listOccurrences reads newest first, which is the wrong way round for a
  // list of what is coming. A service that has already run moves across to
  // what has been, so the first card is really the next one.
  const byWhen = (a: { occursOn: string; startsAt: string }, b: { occursOn: string; startsAt: string }) =>
    a.occursOn.localeCompare(b.occursOn) || a.startsAt.localeCompare(b.startsAt);

  const upcoming = rows.filter((one) => !hasBeen(one, now.date, now.time)).sort(byWhen);
  const over = [...rows.filter((one) => hasBeen(one, now.date, now.time)), ...past]
    .sort((a, b) => byWhen(b, a))
    .slice(0, 2);

  const card = (one: (typeof rows)[number]): ServiceCard => {
    const plan = plans.get(one.id);
    return {
      id: one.id,
      href: canEdit
        ? `/services/${one.slug}/plan?church=${session.tenantSlug}`
        : `/services/${one.slug}?church=${session.tenantSlug}`,
      when: `${readableDay(one.occursOn)} · ${readableTime(one.startsAt)}`,
      name: plan?.title || one.name,
      theme: plan?.theme ?? null,
      items: plan?.items ?? 0,
      minutes: plan?.minutes ?? 0,
    };
  };

  return (
    <AppShell
      session={session}
      title={t("services.title")}
      /* The action rides the board's own header row, beside the view switch,
         rather than taking a band of its own above it. */
    >
      {upcoming.length === 0 && past.length === 0 ? (
        <Empty
          icon="calendar"
          title={t("services.none.title")}
          body={t("services.none.body")}
          action={
            canEdit ? (
              <AddService church={session.tenantSlug} today={now.date} nowTime={now.time} />
            ) : undefined
          }
        />
      ) : (
        <ServiceBoard
          title={t("services.upcoming")}
          upcoming={upcoming.map(card)}
          past={over.map(card)}
          action={
            canEdit ? (
              <AddService church={session.tenantSlug} today={now.date} nowTime={now.time} />
            ) : undefined
          }
        />
      )}
    </AppShell>
  );
}
