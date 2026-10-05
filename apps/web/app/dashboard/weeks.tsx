import { t, plural } from "@hearth/i18n";
import type { ServiceCount } from "@hearth/db";
import { shortDate } from "@/lib/dates";

/**
 * R18.2. Attendance over the last weeks, as a line of bars.
 *
 * One bar per gathering in the order they were held. A gathering nobody
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
  const total = held.reduce((sum, one) => sum + one.present, 0);
  const average = held.length > 0 ? Math.round(total / held.length) : 0;

  return (
    <section className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-bold text-fg">{t("dashboard.overTime")}</h2>
        {held.length > 0 ? (
          <span className="text-caption text-fg-muted tabular-nums">
            {plural("dashboard.average", average)}
          </span>
        ) : null}
      </div>

      {held.length === 0 ? (
        <p className="text-[length:var(--d-text-body)] text-fg-muted">
          {t("dashboard.noAttendance")}
        </p>
      ) : (
        <ol className="flex h-36 items-end gap-1.5">
          {held.map((one) => (
            <li
              key={one.occurrenceId}
              className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1.5"
              title={`${one.name} · ${shortDate(one.occursOn)} · ${one.present}`}
            >
              <span className="text-center text-[11px] text-fg-subtle tabular-nums">
                {one.present}
              </span>
              <span
                aria-hidden
                className="w-full rounded-[4px] bg-[var(--hue-violet-500)]"
                style={{ height: `${Math.max(2, Math.round((one.present / most) * 100))}%` }}
              />
            </li>
          ))}
        </ol>
      )}

      {/* The reader needs to know which end is which, and twelve dates across
          the bottom is twelve dates nobody reads. */}
      {held.length > 1 ? (
        <div className="flex justify-between text-caption text-fg-subtle tabular-nums">
          <span>{shortDate(held[0]!.occursOn)}</span>
          <span>{shortDate(held[held.length - 1]!.occursOn)}</span>
        </div>
      ) : null}
    </section>
  );
}
