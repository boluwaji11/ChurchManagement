import { t, plural } from "@hearth/i18n";
import type { PublicEvent } from "@hearth/db";
import { Markdown } from "@/components/markdown";
import { BrandRuleFor } from "@/components/brand-rule";
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

  const left = event.capacity === null ? null : Math.max(0, event.capacity - event.going);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <BrandRuleFor hue={event.church.brandHue} className="h-1.5 w-full" />

      {banner}

      <header className="flex items-center justify-center gap-2.5 border-b border-line bg-surface px-4 py-3.5">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            aria-hidden
            className="size-7 rounded-lg border border-line bg-surface object-contain p-0.5"
          />
        ) : (
          <span
            aria-hidden
            className="size-2.5 rounded-full"
            style={{ background: `var(--hue-${event.church.brandHue}-500)` }}
          />
        )}
        <span className="text-label font-semibold text-fg">{event.church.name}</span>
      </header>

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="overflow-hidden rounded-[14px] border border-line bg-surface shadow-sm">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="aspect-[16/9] w-full object-cover" />
          ) : (
            <span
              aria-hidden
              className="block h-2.5 w-full"
              style={{ background: `var(--hue-${event.hue}-500)` }}
            />
          )}

          <div className="flex flex-col gap-7 p-6 sm:p-9">
            <div className="flex flex-col gap-2.5 border-b border-line pb-6">
              <h1 className="font-display text-[28px] leading-[34px] text-fg sm:text-[32px] sm:leading-[38px]">
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

            {/* R14.2. A preview shows the page, and the page is what the
                church is checking. The registration form belongs to whoever
                is coming, and drawing a dead one under a preview is a control
                that cannot be used. */}
            {preview ? null : (
              <section className="flex flex-col gap-4 border-t border-line pt-7">
                <h2 className="font-display text-heading text-fg">{t("publicEvent.who")}</h2>
                <Register
                  churchSlug={churchSlug}
                  eventSlug={eventSlug}
                  today={today}
                  state={event.state}
                  questions={event.questions}
                />
              </section>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
