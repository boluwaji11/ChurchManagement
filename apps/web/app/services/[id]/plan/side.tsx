import Link from "next/link";
import { Printer } from "lucide-react";
import { Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import type { ServingTeam } from "./who-serves";

/**
 * R11.3, R11.9. What a leader checks before a service: how long it runs, and
 * whether anybody is missing from it.
 *
 * Down the right of the plan, sticky, because both answers change as the plan
 * is edited and both are the reason somebody opened it.
 */
export function PlanSide({
  church,
  occurrenceId,
  minutes,
  endsAt,
  teams,
  canPrint,
  scheduleHref,
}: {
  church: string;
  occurrenceId: string;
  minutes: number;
  endsAt: string;
  teams: ServingTeam[];
  canPrint: boolean;
  /** R10.3. The board, opened on this service's own column. */
  scheduleHref: string;
}) {
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-[84px]">
      <section className="flex flex-col gap-1.5 rounded-lg border border-line bg-surface p-5">
        <div className="text-[13px] font-medium text-fg-subtle">{t("order.runningTime")}</div>
        <div data-numeric className="font-display text-[40px] leading-[44px] text-fg">
          {t("order.runsMin", { count: minutes })}
        </div>
        <div className="text-[13px] text-fg-muted">{t("order.endsAt", { time: endsAt })}</div>
      </section>

      {teams.length > 0 ? (
        <section className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[13px] font-medium text-fg-subtle">{t("order.serving")}</span>
            <Link
              href={scheduleHref}
              className="text-[13px] font-medium text-primary underline underline-offset-2 hover:text-primary/80"
            >
              {t("order.manageSchedule")}
            </Link>
          </div>

          {/* R24.6. The rail the product uses wherever a few things belong to
              one thing: a dot a row and a line running between them. */}
          <ol className="m-0 flex list-none flex-col p-0">
            {teams.map((team) => {
              const needed = team.positions.reduce((n, p) => n + p.needed, 0);
              const filled = needed - team.positions.reduce((n, p) => n + p.short, 0);
              const short = filled < needed;

              return (
                <li key={team.id} className="flex gap-2.5 last:[&>span:first-child>span:last-child]:hidden">
                  <span className="flex w-4 shrink-0 flex-col items-center" aria-hidden>
                    <span className="mt-2.5 size-2 shrink-0 rounded-full bg-primary" />
                    <span className="my-1 w-px flex-1 bg-primary/40" />
                  </span>

                  <span className="flex min-w-0 flex-1 items-center gap-2.5 py-2 text-[13px]">
                    <span className="min-w-0 flex-1 truncate text-fg">{team.name}</span>
                    <span
                      data-numeric
                      className="font-medium"
                      style={{ color: short ? "var(--color-danger-text)" : "var(--hue-fern-key)" }}
                    >
                      {filled} / {needed}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {canPrint ? (
        <Button variant="secondary" asChild className="justify-center">
          <Link
            href={`/services/${occurrenceId}/plan/print?church=${church}`}
            target="_blank"
          >
            <Printer /> {t("order.printRunSheet")}
          </Link>
        </Button>
      ) : null}
    </aside>
  );
}
