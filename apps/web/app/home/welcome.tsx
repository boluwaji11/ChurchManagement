import Link from "next/link";
import { MapPin, Clock } from "lucide-react";
import { t } from "@connectapp/i18n";
import { onDayLong, readableTime } from "./when";

/**
 * R17.1, R24.4. The band a member's screen opens on.
 *
 * A member signs in two or three times a year and the first question they
 * arrive with is when the church next meets and where. The screen used to
 * answer it nowhere: a greeting, then a white box saying nothing was
 * scheduled for them, which is true of most members most weeks and reads as
 * an empty product.
 *
 * It wears the church's own hue rather than the product's, because this is
 * the one screen a member thinks of as their church rather than as software.
 */
export function Welcome({
  name,
  church,
  hue,
  service,
  where,
  today,
  action,
}: {
  name: string;
  /** The church's name, which is what the line under the greeting is about. */
  church: string;
  hue: string;
  /** The next service, where the church has one coming. */
  service: { name: string; occursOn: string; startsAt: string } | null;
  /** Its address, as one line. */
  where: string | null;
  /** Today where the church is, so "today" and "tomorrow" are true. */
  today: string;
  /** R17.8. The check-in control, when there are children to check in. */
  action?: React.ReactNode;
}) {
  const when = service
    ? service.occursOn === today
      ? t("home.next.today", { time: readableTime(service.startsAt) })
      : t("home.next.day", {
          day: onDayLong(service.occursOn),
          time: readableTime(service.startsAt),
        })
    : null;

  return (
    <div
      className="flex flex-col gap-5 rounded-2xl px-6 py-7 sm:px-8"
      style={{
        background: `linear-gradient(140deg, var(--hue-${hue}-100), var(--color-surface) 78%)`,
      }}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="font-display text-[36px] font-normal leading-[42px] text-fg">
          {t("home.hello", { name })}
        </h1>
        <p className="text-[length:var(--d-text-body)] text-fg-muted">{church}</p>
      </div>

      {service ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="flex min-w-0 items-center gap-2">
            <Clock
              className="size-4 shrink-0"
              style={{ color: `var(--hue-${hue}-700)` }}
              aria-hidden
            />
            <span className="min-w-0 text-[17px] font-semibold leading-6 text-fg">{when}</span>
          </span>

          {where ? (
            <span className="flex min-w-0 items-center gap-2">
              <MapPin className="size-4 shrink-0 text-fg-subtle" aria-hidden />
              <span className="min-w-0 text-[length:var(--d-text-body)] text-fg-muted">
                {where}
              </span>
            </span>
          ) : null}
        </div>
      ) : null}

      {action}
    </div>
  );
}

/**
 * R17.1. The four places a member actually goes, as one row.
 *
 * Everything a member can do here sat behind the tab bar or the account menu,
 * which is two presses and a guess. These are the same destinations, named.
 */
export function Doors({ church, hasGroups }: { church: string; hasGroups: boolean }) {
  const doors: { href: string; label: string }[] = [
    { href: `/events?church=${church}`, label: t("nav.events") },
    {
      href: `/groups?church=${church}`,
      label: hasGroups ? t("home.findAnother") : t("find.title"),
    },
    { href: `/home/schedule?church=${church}`, label: t("nav.serving") },
    { href: `/settings/household?church=${church}`, label: t("home.myHousehold") },
  ];

  return (
    <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr))]">
      {doors.map((door) => (
        <Link
          key={door.href}
          href={door.href}
          className="flex min-h-[var(--d-tap)] items-center justify-center rounded-xl border border-line bg-surface px-3 text-center text-[length:var(--d-text-body)] font-medium text-fg hover:bg-sunken"
        >
          {door.label}
        </Link>
      ))}
    </div>
  );
}
