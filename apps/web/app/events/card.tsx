import Link from "next/link";
import type { ChurchEvent } from "@connectapp/db";
import { LIFT } from "@connectapp/ui";
import { t, plural } from "@connectapp/i18n";
import { longDate, readableTime } from "@/lib/dates";

/**
 * R14.1. One event, as a card.
 *
 * The same shape the group finder uses: a banner across the top, the event's
 * own picture where it has one and its colour flat where it does not, then
 * what it is, its name, when and where, and how it is going. A church reading
 * one of these screens has read both.
 */
export function EventCard({
  church,
  event,
  coverUrl,
}: {
  church: string;
  event: ChurchEvent;
  coverUrl: string | null;
}) {
  const left = !event.takesRegistrations || event.capacity === null
    ? null
    : Math.max(0, event.capacity - event.going);

  const when = [
    longDate(event.startsOn),
    event.startsAt ? readableTime(event.startsAt) : null,
  ].filter(Boolean).join(", ");

  const where = event.location ?? event.city;

  return (
    <section
      className={`relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface ${LIFT}`}
    >
      {coverUrl ? (
        <img src={coverUrl} alt="" className="h-[120px] w-full object-cover" />
      ) : (
        <div className="h-[120px]" style={{ background: `var(--hue-${event.hue}-tint)` }} />
      )}

      <div className="flex flex-col gap-2 px-[18px] pt-4 pb-[18px]">
        <div className="flex items-center gap-2">
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

          <span className="ml-auto text-[12px] font-medium text-fg-muted">
            {!event.takesRegistrations
              ? t("event.informationOnly")
              : left === 0
                ? t("event.full")
                : left === null
                  ? t("event.registrationOpen")
                  : plural("event.placesLeft", left)}
          </span>
        </div>

        <Link
          href={`/events/${event.slug}?church=${church}`}
          className="font-display text-[22px] leading-[28px] text-fg after:absolute after:inset-0 focus-visible:outline-none"
        >
          {event.name}
        </Link>

        <div className="text-[13px] text-fg-muted">
          {when}
          {where ? ` · ${where}` : ""}
        </div>

        {event.takesRegistrations ? (
          <div className="text-[13px] text-fg">
            <strong className="font-semibold">{event.going}</strong>{" "}
            {t("event.registeredWord")}
            {event.waiting > 0 ? ` · ${plural("event.waiting", event.waiting)}` : ""}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Draft is quiet, published is settled, cancelled stops the eye. */
const STATE_HUE: Record<string, string> = {
  draft: "clay",
  published: "fern",
  cancelled: "rose",
};

/**
 * R14.1. The same event as one row.
 *
 * The list view, for a church with forty events that wants to scan names and
 * dates rather than look at forty pictures. Everything the card carries is
 * here, laid along a line instead of down a column.
 */
export function EventRow({
  church,
  event,
  coverUrl,
}: {
  church: string;
  event: ChurchEvent;
  coverUrl: string | null;
}) {
  const left = !event.takesRegistrations || event.capacity === null
    ? null
    : Math.max(0, event.capacity - event.going);

  const when = [
    longDate(event.startsOn),
    event.startsAt ? readableTime(event.startsAt) : null,
  ].filter(Boolean).join(", ");

  const where = event.location ?? event.city;

  return (
    <div className={`relative flex items-center gap-4 px-4 py-3 ${LIFT}`}>
      {coverUrl ? (
        <img src={coverUrl} alt="" className="size-11 shrink-0 rounded-[10px] object-cover" />
      ) : (
        <span
          aria-hidden
          className="size-11 shrink-0 rounded-[10px]"
          style={{ background: `var(--hue-${event.hue}-tint)` }}
        />
      )}

      <div className="flex min-w-0 flex-[2_1_220px] flex-col">
        <Link
          href={`/events/${event.slug}?church=${church}`}
          className="truncate font-medium text-fg after:absolute after:inset-0 focus-visible:outline-none"
        >
          {event.name}
        </Link>
        <span className="truncate text-[13px] text-fg-muted">
          {when}
          {where ? ` · ${where}` : ""}
        </span>
      </div>

      {event.status !== "published" ? (
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium"
          style={{
            background: `var(--hue-${event.status === "cancelled" ? "clay" : "amber"}-tint)`,
            color: `var(--hue-${event.status === "cancelled" ? "clay" : "amber"}-key)`,
          }}
        >
          {t(`event.status.${event.status}` as never)}
        </span>
      ) : null}

      <span className="shrink-0 text-[13px] text-fg-muted tabular-nums">
        {!event.takesRegistrations
          ? t("event.informationOnly")
          : left === 0
            ? t("event.full")
            : left === null
              ? plural("event.registered", event.going)
              : plural("event.placesLeft", left)}
      </span>
    </div>
  );
}
