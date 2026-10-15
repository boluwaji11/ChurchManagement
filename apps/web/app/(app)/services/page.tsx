import {
  withTenant, listOccurrences, topUpCalendar, planSummaries, canManageServices,
} from "@connectapp/db";
import { Empty } from "@/components/empty";
import { t } from "@connectapp/i18n";
import { requireScreen, shellData } from "@/lib/shell-data";
import { Screen } from "@/components/screen";
import { churchNow } from "@/lib/church-now";
import { AddService } from "./add-service";
import { ServiceBoard, type ServiceCard } from "./board";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  return tabMetadata(t("services.title"));
}

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
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  const session = await requireScreen();
  const canEdit = canManageServices(session);

  /* The frame has already read the church, and this screen's clock comes out
     of it. Reading it again was a trip for a timezone. */
  const profile = (await shellData(session)).church;
  const clock = churchNow(profile?.timezone ?? "America/Chicago");

  const { rows, past, plans, now } = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      // Keeps a repeating service some weeks ahead without anybody maintaining
      // a calendar. Idempotent, and it does nothing for a church with none.
      // It writes the occurrences the reads below are about, so it stays in
      // front of them.
      if (canEdit) {
        await topUpCalendar(tx, { tenantId: session.tenantId, role: session.role });
      }

      /*
       * One read over the whole span rather than one looking forward and
       * another looking back. The two ranges meet at today, so a second trip
       * was buying nothing. R11.1 wants what was last held, so a plan can be
       * copied from the week before without hunting for it.
       */
      const span = await listOccurrences(tx, {
        from: shift(clock.date, -PAST_DAYS),
        to: shift(clock.date, AHEAD_DAYS),
      });

      const list = span.filter((one) => one.occursOn >= clock.date);
      const before = span.filter((one) => one.occursOn < clock.date).slice(0, 2);

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
        ? `/services/${one.slug}/plan`
        : `/services/${one.slug}`,
      when: `${readableDay(one.occursOn)} · ${readableTime(one.startsAt)}`,
      name: plan?.title || one.name,
      theme: plan?.theme ?? null,
      items: plan?.items ?? 0,
      minutes: plan?.minutes ?? 0,
    };
  };

  return (
    <Screen>
      {upcoming.length === 0 && past.length === 0 ? (
        <Empty
          icon="calendar"
          title={t("services.none.title")}
          body={t("services.none.body")}
          action={
            canEdit ? (
              <AddService today={now.date} nowTime={now.time} />
            ) : undefined
          }
        />
      ) : (
        <ServiceBoard
          title={t("services.upcoming")}
          upcoming={upcoming.map(card)}
          past={over.map(card)}
          /* R24.6. The screen's one press, at the end of the heading's row
             where the view switch already lives. */
          action={
            canEdit ? (
              <AddService today={now.date} nowTime={now.time} />
            ) : undefined
          }
        />
      )}
    </Screen>
  );
}
