import Link from "next/link";
import { Printer } from "lucide-react";
import { Button } from "@hearth/ui";
import { t } from "@hearth/i18n";
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
}: {
  church: string;
  occurrenceId: string;
  minutes: number;
  endsAt: string;
  teams: ServingTeam[];
  canPrint: boolean;
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
          <div className="text-[13px] font-medium text-fg-subtle">{t("order.serving")}</div>
          {teams.map((team) => {
            const needed = team.positions.reduce((n, p) => n + p.needed, 0);
            const filled = needed - team.positions.reduce((n, p) => n + p.short, 0);
            const short = filled < needed;

            return (
              <div key={team.id} className="flex items-center gap-2.5 text-[13px]">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: `var(--hue-${team.hue}-500)` }}
                />
                <span className="min-w-0 flex-1 truncate text-fg">{team.name}</span>
                <span
                  data-numeric
                  className="font-medium"
                  style={{ color: short ? "var(--color-danger-text)" : "var(--hue-fern-key)" }}
                >
                  {filled} / {needed}
                </span>
              </div>
            );
          })}
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
