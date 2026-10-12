import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { publicChurch, publicEvents, publicChurchTimezone } from "@connectapp/db";
import { Card } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Empty } from "@/components/empty";
import { BrandRuleFor } from "@/components/brand-rule";
import { photoUrls } from "@/lib/photos";
import { churchNow } from "@/lib/church-now";

/**
 * R14.2, R9.5. What this church has coming up, for anybody at all.
 *
 * The page a church links to from its own website, and the same screen for
 * both ways in: its own address, where the host names it and the path is
 * `/e`, and ours, where the path has to.
 *
 * Only what is still ahead. A what's-on page is about what is on, and the
 * church's own date decides it, so an event running today is still listed at
 * eleven at night three timezones away.
 */
export async function EventsScreen({
  slug,
  fromHost,
  /** R9.5. Inside the church's own page: no rule, no name, no padding. */
  bare,
}: {
  slug: string;
  fromHost?: boolean;
  bare?: boolean;
}) {
  const clock = churchNow(await publicChurchTimezone(slug));

  const [church, events] = await Promise.all([
    publicChurch(slug),
    publicEvents(slug, clock.date),
  ]);
  if (!church) notFound();

  const signed = await photoUrls(events.map((one) => one.coverKey));
  const covers = new Map<string, string>(
    events.flatMap((one) => {
      const url = one.coverKey ? signed[one.coverKey] : undefined;
      return url ? [[one.id, url] as const] : [];
    }),
  );

  const list =
    events.length === 0 ? (
      <Empty icon="calendar" title={t("publicEvents.none")} body={t("publicEvents.none.body")} />
    ) : (
      <ul className="grid gap-4 sm:grid-cols-2">
        {events.map((one) => (
          <li key={one.id}>
            <Card className="relative flex h-full flex-col gap-2 overflow-hidden transition-shadow focus-within:shadow-md hover:shadow-md">
              {covers.get(one.id) ? (
                <img
                  src={covers.get(one.id)}
                  alt=""
                  className="-mx-[var(--d-pad-card)] -mt-[var(--d-pad-card)] mb-1 h-32 w-[calc(100%+2*var(--d-pad-card))] object-cover"
                />
              ) : null}

              <Link
                href={fromHost ? `/e/${one.slug}` : `/e/${slug}/${one.slug}`}
                /* R9.5. Inside a frame the event opens in the whole window,
                   because an event's page is a page rather than a panel. */
                {...(bare ? { target: "_top" as const } : {})}
                className="text-heading text-fg after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none"
              >
                {one.name}
              </Link>

              <p className="m-0 flex items-center gap-1.5 text-caption text-fg-muted">
                <CalendarDays className="size-[14px] shrink-0" aria-hidden />
                {one.startsOn}
                {one.startsAt ? ` · ${one.startsAt.slice(0, 5)}` : ""}
              </p>

              {one.location || one.city ? (
                <p className="m-0 flex items-center gap-1.5 text-caption text-fg-muted">
                  <MapPin className="size-[14px] shrink-0" aria-hidden />
                  {[one.location, one.city].filter(Boolean).join(", ")}
                </p>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
    );

  if (bare) return <main data-theme="light" id="main" className="w-full p-4">{list}</main>;

  return (
    <div data-theme="light" className="site-wash flex min-h-dvh flex-col">
      <BrandRuleFor hue={church.brandHue} className="h-1.5 w-full" />

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="mb-8 font-display text-display text-fg">
          {t("publicEvents.title", { church: church.name })}
        </h1>

        {list}
      </main>
    </div>
  );
}
