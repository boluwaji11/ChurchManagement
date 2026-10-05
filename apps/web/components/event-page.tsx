import { t, plural } from "@hearth/i18n";
import type { PublicEvent } from "@hearth/db";
import { Markdown } from "@/components/markdown";
import { longDate, readableTime } from "@/lib/dates";
import { oneLineAddress } from "@/lib/address";
import { Register } from "@/app/e/[slug]/[event]/register";

/**
 * R14.2. An event as the open web sees it.
 *
 * One component, so the page a church links to and the preview a church looks
 * at before publishing cannot drift apart. A preview that does not match what
 * the congregation will see is worse than no preview.
 */
export function EventPage({
  event,
  coverUrl,
  logoUrl,
  churchSlug,
  eventSlug,
  today,
  banner,
  preview = false,
}: {
  event: PublicEvent;
  coverUrl: string | null;
  logoUrl: string | null;
  churchSlug: string;
  eventSlug: string;
  today: string;
  /** Shown above everything on the preview, to say this is not the live page. */
  banner?: React.ReactNode;
  /**
   * R14.2. A preview draws the form and refuses to send it.
   *
   * Somebody checking their own page should not end up on their own roster,
   * and a draft has no business taking registrations at all.
   */
  preview?: boolean;
}) {
  const when = [
    longDate(event.startsOn),
    event.startsAt ? readableTime(event.startsAt) : null,
  ].filter(Boolean).join(", ");

  const until = event.endsOn && event.endsOn !== event.startsOn
    ? t("event.toDate", { date: longDate(event.endsOn) })
    : null;

  const address = oneLineAddress({
    line1: event.addressLine1 ?? "",
    line2: event.addressLine2 ?? "",
    city: event.city ?? "",
    region: event.region ?? "",
    postalCode: event.postalCode ?? "",
    country: event.country ?? "",
  });

  const left = event.capacity === null || !event.showCapacity
    ? null
    : Math.max(0, event.capacity - event.going);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {banner}

      {/* The church's own mark and name, first thing, left, the way its own
          website opens. No coloured rule over the top: the page already carries
          the event's colour, and two bands of colour above the fold is one more
          than the page needs. */}
      <header className="px-5 pt-5 pb-1 sm:px-8">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              aria-hidden
              className="size-11 rounded-xl border border-line bg-surface object-contain p-1"
            />
          ) : null}
          <span className="font-display text-[22px] leading-7 text-fg">
            {event.church.name}
          </span>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        {/* The page is the page. A card inside it drew a second edge around
            content that already had one, and on a phone it was a border two
            thumbs wide around everything. */}
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="aspect-[16/9] w-full rounded-[14px] object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="block h-2.5 w-full rounded-full"
            style={{ background: `var(--hue-${event.hue}-500)` }}
          />
        )}

        <div className="mt-8 flex flex-col gap-7">
          <div className="flex flex-col gap-2.5 border-b border-line pb-7">
            <h1 className="font-display text-[30px] leading-[36px] text-fg sm:text-[36px] sm:leading-[42px]">
              {event.name}
            </h1>
            <p className="text-[length:var(--d-text-body)] leading-6 text-fg-muted">
              {when}
              {until ? ` ${until}` : ""}
            </p>
            {event.location || address ? (
              <p className="text-[length:var(--d-text-body)] leading-6 text-fg-muted">
                {[event.location, address].filter(Boolean).join(", ")}
              </p>
            ) : null}
            {left !== null && event.state === "open" ? (
              <p className="text-caption text-fg-subtle tabular-nums">
                {plural("publicEvent.placesLeft", left)}
              </p>
            ) : null}
          </div>

          {event.description ? (
            <Markdown text={event.description} className="max-w-[68ch]" />
          ) : null}

          {/* R14.2. A preview draws the whole page, registration included, so
              a church sees what it is about to publish. It refuses to send,
              because somebody checking their own page should not end up on
              their own roster. */}
          {event.state === "none" ? null : (
            <section className="flex flex-col gap-4 border-t border-line pt-7">
              <h2 className="font-display text-heading text-fg">{t("publicEvent.who")}</h2>
              <Register
                churchSlug={churchSlug}
                eventSlug={eventSlug}
                today={today}
                state={event.state}
                questions={event.questions}
                preview={preview}
              />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
