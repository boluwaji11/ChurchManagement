import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { t, plural } from "@connectapp/i18n";
import type { PublicEvent } from "@connectapp/db";
import { longDate, readableTime } from "@/lib/dates";
import { Register } from "@/app/e/[slug]/[event]/register";
import { PublicFooter } from "@/components/public-footer";

/**
 * R14.2, R14.6. Registering, with the event still on screen.
 *
 * The event is what somebody is signing up for, so it stays at the top of the
 * page they sign up on: its picture, its name, its date, and how many seats are
 * left. Sending them to a page titled after the form lost the event, and a
 * reader who cannot see what they are registering for hesitates.
 *
 * One component, so the live page and the preview cannot drift apart.
 */
export function EventRegisterPage({
  event,
  churchSlug,
  eventSlug,
  today,
  coverUrl,
  logoUrl,
  backHref,
  bare,
  banner,
  onTrial,
  me,
}: {
  event: PublicEvent;
  churchSlug: string;
  eventSlug: string;
  today: string;
  coverUrl: string | null;
  logoUrl: string | null;
  /** Back to the event itself, live or previewed. */
  backHref: string;
  /** R17.1. Read inside the portal, where the frame is already drawn. */
  bare?: boolean;
  banner?: React.ReactNode;
  /** R14.2. Where the church's own preview sends its places instead. */
  onTrial?: React.ComponentProps<typeof Register>["onTrial"];
  /** R14.3. Who is reading, where they are a member of this church. */
  me?: React.ComponentProps<typeof Register>["me"];
}) {
  const when = [
    longDate(event.startsOn),
    event.startsAt ? readableTime(event.startsAt) : null,
  ].filter(Boolean).join(", ");

  const left = event.capacity === null || !event.showCapacity
    ? null
    : Math.max(0, event.capacity - event.going);

  const head = (
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
  );

  const body = (
      <main
        id={bare ? undefined : "main"}
        className={bare
          ? "flex w-full flex-1 flex-col gap-7"
          : "mx-auto flex w-full max-w-3xl flex-1 flex-col gap-7 px-5 pt-4 pb-10 sm:px-8 sm:pt-5 sm:pb-12"}
      >
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center gap-1.5 self-start font-medium text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden /> {t("publicEvent.backToEvent")}
        </Link>

        {/* What they are registering for, held at the top of every step. */}
        <div className="flex items-center gap-4 rounded-[14px] border border-line bg-surface p-3.5">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              aria-hidden
              className="size-14 shrink-0 rounded-[10px] object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="size-14 shrink-0 rounded-[10px]"
              style={{ background: `var(--hue-${event.hue}-tint)` }}
            />
          )}
          {/* On a phone the count drops under the date rather than taking a
              third of the row and breaking the date across two lines. */}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 flex-col gap-0.5 sm:flex-1">
              <span className="truncate font-display text-[19px] leading-6 text-fg">
                {event.name}
              </span>
              <span className="text-caption text-fg-muted">{when}</span>
            </div>
            {left !== null && event.state === "open" ? (
              <span className="shrink-0 text-caption text-fg-subtle tabular-nums">
                {plural("publicEvent.placesLeft", left)}
              </span>
            ) : null}
          </div>
        </div>

        <Register
          me={me}
          churchSlug={churchSlug}
          eventSlug={eventSlug}
          today={today}
          state={event.state}
          questions={event.questions}
          formSlug={event.formSlug}
          onTrial={onTrial}
        />
      </main>
  );

  if (bare) return body;

  return (
    <div data-theme="light" className="site-wash flex min-h-dvh flex-col">
      {banner}
      {head}
      {body}
      <PublicFooter church={event.church} />
    </div>
  );
}
