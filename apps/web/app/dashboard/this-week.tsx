import Link from "next/link";
import { t } from "@connectapp/i18n";
import { Panel } from "./panel";

export interface WeekEntry {
  id: string;
  /** Mon, Tue, the church's own day names. */
  day: string;
  title: string;
  time: string;
  hue: string;
  href?: string;
}

/**
 * R15.1. What the church has on between now and the end of the week.
 *
 * Services, published events and the groups that meet, in the one list, because
 * a church thinks about its week as a week rather than as three screens. The
 * calendar is where the rest of it lives, and the heading links there.
 */
export function ThisWeek({ church, entries }: { church: string; entries: WeekEntry[] }) {
  return (
    <Panel
      title={t("dashboard.thisWeek")}
      link={{ label: t("nav.calendar"), href: `/calendar?church=${church}` }}
    >
      {entries.length === 0 ? (
        <p className="text-[length:var(--d-text-body)] text-fg-muted">
          {t("dashboard.weekEmpty")}
        </p>
      ) : (
        <ol className="flex flex-col">
          {entries.map((one) => {
            const body = (
              <>
                <span className="w-11 shrink-0 text-[12px] font-medium text-fg-subtle">
                  {one.day}
                </span>
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: `var(--hue-${one.hue}-500)` }}
                />
                <span className="min-w-0 flex-1 truncate font-medium text-fg">{one.title}</span>
                <span className="shrink-0 text-[13px] text-fg-subtle tabular-nums">
                  {one.time}
                </span>
              </>
            );

            return (
              <li key={one.id} className="border-t border-line first:border-t-0">
                {one.href ? (
                  <Link
                    href={`${one.href}?church=${church}`}
                    className="flex items-center gap-3 py-2.5 transition-colors hover:text-primary"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 py-2.5">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}
