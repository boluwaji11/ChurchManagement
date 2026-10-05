import { redirect } from "next/navigation";
import {
  withTenant, getChurch, canEditPeople, canReadIncidents,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { visitorFunnel } from "@hearth/db";
import { plural } from "@hearth/i18n";
import { ReportFrame, backBy, windowOf } from "../frame";

export const dynamic = "force-dynamic";

/**
 * R18.3. What happens after somebody first turns up.
 *
 * The PRD calls this the single most valuable report a small church can have,
 * and it is: every other number says how the church is doing, this one says
 * where it is losing people.
 *
 * Drawn as bars whose width is the share of the step above, so the place the
 * funnel narrows is the thing the eye lands on.
 */
export default async function VisitorReport({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; days?: string }>;
}) {
  const { church, days } = await searchParams;
  const session = await requireSession(church);
  if (!canEditPeople(session) && !canReadIncidents(session)) {
    redirect(`/home?church=${session.tenantSlug}`);
  }

  const window = windowOf(days);

  const steps = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const clock = churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago");
      return visitorFunnel(tx, { from: backBy(clock.date, window), to: clock.date });
    },
  );

  const most = Math.max(1, ...steps.map((one) => one.people));

  const elapsed = (days_: number | null) =>
    days_ === null ? "" : days_ === 0 ? t("reports.sameDay") : plural("reports.days", days_);

  return (
    <AppShell session={session} title={t("reports.title")}>
      <ReportFrame
        church={session.tenantSlug}
        title={t("reports.visitors.title")}
        window={window}
        path="visitors"
      >
        {steps[0]!.people === 0 ? (
          <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("reports.none")}</p>
        ) : (
          <>
            <ol className="flex flex-col gap-3">
              {steps.map((one, at) => (
                <li key={one.key} className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="min-w-[160px] flex-1 font-medium text-fg">
                      {t(`reports.step.${one.key}` as never)}
                    </span>
                    <span className="text-[length:var(--d-text-body)] text-fg tabular-nums">
                      {one.people}
                    </span>
                    {at > 0 ? (
                      <span className="w-14 text-right text-caption text-fg-muted tabular-nums">
                        {one.rate}%
                      </span>
                    ) : (
                      <span className="w-14" />
                    )}
                    <span className="w-24 text-right text-caption text-fg-subtle tabular-nums">
                      {elapsed(one.medianDays)}
                    </span>
                  </div>

                  <span
                    aria-hidden
                    className="h-2.5 rounded-full bg-[var(--hue-amber-500)]"
                    style={{ width: `${Math.max(1, Math.round((one.people / most) * 100))}%` }}
                  />
                </li>
              ))}
            </ol>

            <p className="text-caption text-fg-muted">{t("reports.funnelNote")}</p>
          </>
        )}
      </ReportFrame>
    </AppShell>
  );
}
