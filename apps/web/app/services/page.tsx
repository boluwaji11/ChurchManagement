import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  withTenant, listOccurrences, topUpCalendar, planSummaries, getChurch, canManageServices,
} from "@hearth/db";
import { EmptyState } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { churchNow } from "@/lib/church-now";
import { AddService } from "./add-service";

export const dynamic = "force-dynamic";

/** How far ahead the screen reads. A church plans a few weeks, not a year. */
const AHEAD_DAYS = 70;

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
 * A card a gathering, in the order they happen, with the two numbers that say
 * whether anybody has done anything about it yet. Opening one goes to its
 * order of service, which is what a church came here to write.
 */
export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  const canEdit = canManageServices(session.role);

  const { rows, plans, now } = await withTenant(
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

      return {
        now: clock,
        rows: list,
        plans: await planSummaries(tx, list.map((one) => one.id)),
      };
    },
  );

  // listOccurrences reads newest first, which is the wrong way round for a
  // list of what is coming.
  const upcoming = [...rows].sort(
    (a, b) => a.occursOn.localeCompare(b.occursOn) || a.startsAt.localeCompare(b.startsAt),
  );

  return (
    <AppShell
      session={session}
      title={t("services.title")}
      action={
        canEdit ? (
          <AddService church={session.tenantSlug} today={now.date} nowTime={now.time} />
        ) : undefined
      }
    >
      <h2 className="font-display text-[28px] leading-[34px] text-fg">
        {t("services.upcoming")}
      </h2>

      {upcoming.length === 0 ? (
        <EmptyState title={t("services.none.title")} body={t("services.none.body")} />
      ) : (
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          {upcoming.map((one, i) => {
            const plan = plans.get(one.id);
            const planned = (plan?.items ?? 0) > 0;

            return (
              <Link
                key={one.id}
                href={
                  canEdit
                    ? `/services/${one.id}/plan?church=${session.tenantSlug}`
                    : `/services/${one.id}?church=${session.tenantSlug}`
                }
                className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4.5 hover:border-line-strong"
              >
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-[13px] font-medium text-fg-subtle">
                    {readableDay(one.occursOn)} · {readableTime(one.startsAt)}
                  </span>
                  {i === 0 ? (
                    <span className="flex h-[22px] items-center rounded-full bg-primary-soft px-2 text-[11px] font-semibold text-primary">
                      {t("services.next")}
                    </span>
                  ) : null}
                </div>

                <div>
                  <div className="font-display text-[21px] leading-[26px] text-fg">
                    {plan?.title || one.name}
                  </div>
                  {plan?.theme ? (
                    <div className="mt-0.5 text-[13px] text-fg-muted">{plan.theme}</div>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 border-t border-sunken pt-3 text-[13px]">
                  {planned ? (
                    <span className="flex-1 text-fg-muted">
                      {t("services.planned", {
                        items: plan?.items ?? 0,
                        minutes: plan?.minutes ?? 0,
                      })}
                    </span>
                  ) : (
                    <span
                      className="flex-1 font-medium"
                      style={{ color: "var(--hue-amber-key)" }}
                    >
                      {t("services.notPlanned")}
                    </span>
                  )}
                  <ChevronRight className="size-4 text-fg-subtle" aria-hidden />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
