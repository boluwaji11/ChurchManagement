import Link from "next/link";
import type { ChurchEvent } from "@hearth/db";
import { t, plural } from "@hearth/i18n";
import { longDate, readableTime } from "@/lib/dates";

/**
 * R14.1. One event in the list.
 *
 * The date tile leads, in the event's own colour, because a church scanning
 * this screen is scanning for when. The whole card opens the event (R24.6).
 */
export function EventCard({
  church,
  event,
  lift,
}: {
  church: string;
  event: ChurchEvent;
  lift: string;
}) {
  const left = event.capacity === null ? null : Math.max(0, event.capacity - event.going);

  const when = [
    longDate(event.startsOn),
    event.startsAt ? readableTime(event.startsAt) : null,
  ]
    .filter(Boolean)
    .join(", ");

  const where = event.location ?? event.city;

  return (
    <div
      className={`relative flex cursor-pointer flex-col gap-3 overflow-hidden rounded-[14px] border border-line bg-surface p-5 ${lift}`}
    >
      <span
        aria-hidden
        className="-mx-5 -mt-5 h-1.5 w-[calc(100%+2.5rem)]"
        style={{ background: `var(--hue-${event.hue}-500)` }}
      />

      <div className="flex flex-col gap-1">
        <Link
          href={`/events/${event.id}?church=${church}`}
          className="font-display text-[22px] leading-7 text-fg after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none"
        >
          {event.name}
        </Link>
        <span className="text-[13px] text-fg-muted">
          {when}
          {where ? ` · ${where}` : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[12px] font-medium"
          style={
            event.archivedAt
              ? { background: "var(--hue-clay-tint)", color: "var(--hue-clay-key)" }
              : {
                  background: `var(--hue-${STATE_HUE[event.status]}-tint)`,
                  color: `var(--hue-${STATE_HUE[event.status]}-key)`,
                }
          }
        >
          {event.archivedAt
            ? t("event.status.archived")
            : t(`event.status.${event.status}` as never)}
        </span>

        <span className="text-[12px] text-fg-subtle tabular-nums">
          {plural("event.registered", event.going)}
          {event.waiting > 0 ? ` · ${plural("event.waiting", event.waiting)}` : ""}
          {left !== null
            ? ` · ${left === 0 ? t("event.full") : plural("event.placesLeft", left)}`
            : ""}
        </span>
      </div>
    </div>
  );
}

/** Draft is quiet, published is settled, cancelled stops the eye. */
const STATE_HUE: Record<string, string> = {
  draft: "clay",
  published: "fern",
  cancelled: "rose",
};
