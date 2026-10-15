import { t } from "@connectapp/i18n";
import type { ServiceCount } from "@connectapp/db";
import { shortDate } from "@/lib/dates";
import { Panel } from "./panel";
import { Tooltip } from "@connectapp/ui";

/**
 * R18.2. Attendance over the last weeks, as a line of bars.
 *
 * One bar per service in the order they were held, the most recent one in
 * full ink so the eye lands on where the church is now. A service nobody
 * recorded is still drawn, flat, because a gap in the record is a fact about
 * the record and smoothing it over tells a church it has twelve weeks of
 * numbers when it has nine.
 *
 * Drawn from divs rather than a charting library: twelve bars is not a reason
 * to ship a hundred kilobytes, and these inherit the product's own colours.
 */
export function Weeks({ services, today }: { services: ServiceCount[]; today: string }) {
  const held = services.filter((one) => one.occursOn <= today);
  const most = Math.max(1, ...held.map((one) => one.present));

  return (
    <Panel title={t("dashboard.overTime")} aside={t("dashboard.lastWeeks")}>
      {held.length === 0 ? (
        <p className="text-[length:var(--d-text-body)] text-fg-muted">
          {t("dashboard.noAttendance")}
        </p>
      ) : (
        <>
          <ol className="flex h-[120px] items-end gap-1.5">
            {held.map((one, i) => (
              <Tooltip
                key={one.occurrenceId}
                content={`${one.name} · ${shortDate(one.occursOn)} · ${one.present}`}
              >
              <li
                className="min-w-0 flex-1 rounded-[4px]"
                style={{
                  height: `${Math.max(2, Math.round((one.present / most) * 100))}%`,
                  background:
                    i === held.length - 1
                      ? "var(--hue-violet-key)"
                      : "var(--hue-violet-tint)",
                }}
              />
              </Tooltip>
            ))}
          </ol>

          {/* The reader needs to know which end is which, and twelve dates
              across the bottom is twelve dates nobody reads. */}
          {held.length > 1 ? (
            <div className="mt-3 flex justify-between text-caption text-fg-subtle tabular-nums">
              <span>{shortDate(held[0]!.occursOn)}</span>
              <span>{shortDate(held[held.length - 1]!.occursOn)}</span>
            </div>
          ) : null}
        </>
      )}
    </Panel>
  );
}
