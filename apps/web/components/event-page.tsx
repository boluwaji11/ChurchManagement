import { t, plural } from "@connectapp/i18n";
import type { PublicEvent } from "@connectapp/db";
import Link from "next/link";
import { Button } from "@connectapp/ui";
import { Markdown } from "@/components/markdown";
import { longDate, readableTime } from "@/lib/dates";
import { oneLineAddress, directionsLink } from "@/lib/address";
import { PublicFooter } from "@/components/public-footer";

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
  banner,
  registerHref,
}: {
  event: PublicEvent;
  coverUrl: string | null;
  logoUrl: string | null;
  /** Shown above everything on the preview, to say this is not the live page. */
  banner?: React.ReactNode;
  /** Where Register goes. The public route, or the preview's own. */
  registerHref: string;
}) {
  const when = [
    longDate(event.startsOn),
    event.startsAt ? readableTime(event.startsAt) : null,
  ].filter(Boolean).join(", ");

  const until = event.endsOn && event.endsOn !== event.startsOn
    ? t("event.toDate", { date: longDate(event.endsOn) })
    : null;

  const place = {
    line1: event.addressLine1 ?? "",
    line2: event.addressLine2 ?? "",
    city: event.city ?? "",
    region: event.region ?? "",
    postalCode: event.postalCode ?? "",
    country: event.country ?? "",
  };
  const address = oneLineAddress(place);
  const directions = directionsLink(place);

  const left = event.capacity === null || !event.showCapacity
    ? null
    : Math.max(0, event.capacity - event.going);

  return (
    <div data-theme="light" className="site-wash flex min-h-dvh flex-col">
      {banner}

      {/* The church's own mark and name, first thing, left, the way its own
          website opens. No coloured rule over the top: the page already carries
          the event's colour, and two bands of colour above the fold is one more
          than the page needs. */}
      <header className="sticky top-0 z-20 border-b border-line bg-[color-mix(in_oklch,var(--canvas)_88%,transparent)] backdrop-blur-[10px] px-5 py-3 sm:px-8">
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

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-5 pt-4 pb-10 sm:px-8 sm:pt-5 sm:pb-14">
        {/* The page is the page. A card inside it drew a second edge around
            content that already had one, and on a phone it was a border two
            thumbs wide around everything. */}
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="aspect-[5/2] w-full rounded-[14px] object-cover"
          />
        ) : (
          /* No picture, so the event's own colour fills the same space the
             picture would have. A page that opens on a hairline opens on
             nothing. */
          <span
            aria-hidden
            className="block aspect-[5/2] w-full rounded-[14px]"
            style={{ background: `var(--hue-${event.hue}-tint)` }}
          />
        )}

        <div className="mt-8 flex flex-col gap-7">
          {/* What it is on the left, the way in on the right. Register beside
              the date is the first thing a reader looks for once they have
              decided they are coming, and at the end of the page it was below
              everything they had to scroll past. */}
          <div className="flex flex-wrap items-center justify-between gap-5 border-b border-line pb-7">
            <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2.5">
              <h1 className="font-display text-[30px] leading-[36px] text-fg sm:text-[36px] sm:leading-[42px]">
                {event.name}
              </h1>
              <p className="text-[length:var(--d-text-body)] leading-6 text-fg-muted">
                {when}
                {until ? ` ${until}` : ""}
              </p>
              {/* The place it is, then the address under it, because a reader
                  looking for the venue and a reader looking for the street are
                  two different readers. */}
              {event.location ? (
                <p className="text-[length:var(--d-text-body)] leading-6 text-fg">
                  {event.location}
                </p>
              ) : null}
              {address ? (
                <p className="text-[length:var(--d-text-body)] leading-6 text-fg-muted">
                  {address}
                </p>
              ) : null}
              {/* On its own line under the address, because it is a thing to
                  press rather than the end of a sentence. */}
              {directions ? (
                <a
                  href={directions}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="self-start font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t("common.directions")}
                </a>
              ) : null}
              {left !== null && event.state === "open" ? (
                <p className="text-caption text-fg-subtle tabular-nums">
                  {plural("publicEvent.placesLeft", left)}
                </p>
              ) : null}
            </div>

            {event.state === "none" ? null : (
              <div className="flex flex-col items-end gap-2">
                {event.state === "open" || event.state === "waitlist" ? (
                  <>
                    {event.state === "waitlist" ? (
                      <p className="text-caption text-fg-muted">
                        {t("publicEvent.waitlistOpen")}
                      </p>
                    ) : null}
                    <Button asChild className="min-w-[180px]">
                      <Link href={registerHref}>{t("publicEvent.registerNow")}</Link>
                    </Button>
                  </>
                ) : (
                  <p className="text-[length:var(--d-text-body)] text-fg-muted">
                    {event.state === "cancelled"
                      ? t("publicEvent.cancelled")
                      : event.state === "full"
                        ? t("publicEvent.full")
                        : t("publicEvent.closed")}
                  </p>
                )}
              </div>
            )}
          </div>

          {event.description ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-[12px] font-bold tracking-[0.06em] text-fg uppercase">
                {t("event.about")}
              </h2>
              <Markdown text={event.description} className="max-w-[68ch]" />
            </section>
          ) : null}

        </div>
      </main>

      <PublicFooter church={event.church} />
    </div>
  );
}
