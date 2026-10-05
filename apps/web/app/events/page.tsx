import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, getChurch, listEvents, countArchivedEvents, canManageEvents,
} from "@connectapp/db";
import { t, plural } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { churchNow } from "@/lib/church-now";
import { Empty } from "@/components/empty";
import { NewEventButton } from "./new-event";
import { EventCard, EventRow } from "./card";
import { EventSearch } from "./event-search";
import { MemberEvents } from "./member-events";

export const dynamic = "force-dynamic";

/**
 * R14.1. How far back the list reads.
 *
 * Two years of what a church has run is enough to copy last year's camp from.
 * Anything older is found by searching or in the archive.
 */
const PAST_DAYS = 730;

/** The same date, a number of days earlier, as YYYY-MM-DD. */
function backBy(iso: string, days: number): string {
  const at = new Date(`${iso}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() - days);
  return at.toISOString().slice(0, 10);
}

/**
 * R14.1. What the church is putting on.
 *
 * Two lists, not one. Everything still to come leads, because that is what
 * somebody opening this screen came for, and what has been and gone sits under
 * it newest first, which is the order a church reads history in. A single list
 * sorted by date buries this weekend's picnic under four years of camps.
 */
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; archived?: string }>;
}) {
  const { church, archived } = await searchParams;
  const session = await requireSession(church);

  /*
   * R14.2, R17.1. A member reads the same list from the other side: what the
   * church has coming up, in the portal's own frame, with none of the running
   * of it. Whoever manages events keeps the screen below.
   */
  if (!canManageEvents(session)) return <MemberEvents session={session} />;

  const putAway = archived === "1";
  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const { events, archivedCount, today } = await withTenant(ctx, async (tx) => {
    const clock = churchNow(
      (await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago",
    );
    return {
      today: clock.date,
      // R14.1. A window rather than everything the church has ever run. Older
      // events are still there, through the archive link under the list.
      events: await listEvents(
        tx,
        putAway ? { archivedOnly: true } : { from: backBy(clock.date, PAST_DAYS) },
      ),
      archivedCount: await countArchivedEvents(tx),
    };
  });

  // An event runs until its last day, so one that started on Friday is still to
  // come on the Saturday somebody looks at this screen.
  const lastDay = (one: { startsOn: string; endsOn: string | null }) =>
    one.endsOn ?? one.startsOn;

  const ahead = events.filter((one) => lastDay(one) >= today);
  const gone = events
    .filter((one) => lastDay(one) < today)
    .sort((a, b) => b.startsOn.localeCompare(a.startsOn));

  /*
   * R14.1. Grouped by what state each event is in, not by when it happens.
   *
   * Published leads, because that is what the congregation can see and what a
   * church checks first. Drafts sit under it, which is the pile of work. What
   * has been and gone goes last, newest first, which is the order history is
   * read in.
   */
  const sections = [
    { key: "published", heading: t("event.published"), rows: ahead.filter((one) => one.status === "published") },
    { key: "draft", heading: t("event.draft"), rows: ahead.filter((one) => one.status === "draft") },
    { key: "cancelled", heading: t("event.cancelled"), rows: ahead.filter((one) => one.status === "cancelled") },
    { key: "past", heading: t("event.past"), rows: gone },
  ].filter((section) => section.rows.length > 0);

  // The bucket is private, so each banner is served through a signed link.
  const covers = new Map<string, string>();
  const withCovers = events.filter((one) => one.coverKey);
  if (withCovers.length > 0) {
    const supabase = await supabaseServer();
    for (const one of withCovers) {
      const signed = await supabase.storage
        .from("church")
        .createSignedUrl(one.coverKey!, 3600);
      if (signed.data?.signedUrl) covers.set(one.id, signed.data.signedUrl);
    }
  }

  const action = putAway ? undefined : <NewEventButton church={session.tenantSlug} />;

  // R24.17. An empty screen offers the action in the middle, where the eye
  // already is, so the band above it does not say the same thing twice.
  return (
    <AppShell
      session={session}
      title={t("event.title")}
      /* No action in the band above: it shares a line with the search, and on
         an empty screen it sits in the empty state where the eye already is. */
    >
      {putAway ? (
        <Link
          href={`/events?church=${session.tenantSlug}`}
          className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
        >
          <ArrowLeft className="size-4" /> {t("event.archived.back")}
        </Link>
      ) : null}

      {events.length === 0 ? (
        <Empty
          icon="calendar"
          title={putAway ? t("event.archived.none") : t("event.empty")}
          action={action}
        />
      ) : (
        <EventSearch
          count={events.length}
          action={action}
          sections={sections.map((section) => ({
            key: section.key,
            heading: section.heading,
            items: section.rows.map((one) => ({
              id: one.id,
              name: one.name,
              startsOn: one.startsOn,
              createdAt: one.createdAt.toISOString(),
              card: (
                <EventCard
                  church={session.tenantSlug}
                  event={one}
                  coverUrl={covers.get(one.id) ?? null}
                />
              ),
              row: (
                <EventRow
                  church={session.tenantSlug}
                  event={one}
                  coverUrl={covers.get(one.id) ?? null}
                />
              ),
            })),
          }))}
        />
      )}

      {!putAway && archivedCount > 0 ? (
        <Link
          href={`/events?church=${session.tenantSlug}&archived=1`}
          className="self-start text-[13px] text-fg-muted underline-offset-4 hover:text-fg hover:underline"
        >
          {plural("event.archived.link", archivedCount)}
        </Link>
      ) : null}
    </AppShell>
  );
}
