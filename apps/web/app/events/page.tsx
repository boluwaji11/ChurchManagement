import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, getChurch, listEvents, countArchivedEvents, canManageEvents,
} from "@hearth/db";
import { t, plural } from "@hearth/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { churchNow } from "@/lib/church-now";
import { Empty } from "@/components/empty";
import { NewEventButton } from "./new-event";
import { EventCard } from "./card";

export const dynamic = "force-dynamic";

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

  if (!canManageEvents(session)) redirect(`/?church=${session.tenantSlug}`);

  const putAway = archived === "1";
  const ctx = {
    tenantId: session.tenantId,
    role: session.role,
    userId: session.userId,
    permissions: session.permissions,
  };

  const { events, archivedCount, today } = await withTenant(ctx, async (tx) => ({
    events: await listEvents(tx, putAway ? { archivedOnly: true } : {}),
    archivedCount: await countArchivedEvents(tx),
    today: churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago").date,
  }));

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
      /* The action rides the first section's heading, so it is not a band of
         its own above the content. */
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
        <div className="flex flex-col gap-8">
          {sections.map((section, at) => (
            <section key={section.key} className="flex flex-col gap-3.5">
              {/* The action rides the first heading, so the screen opens on
                  its content rather than on a band holding one button. */}
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="flex-1 text-[13px] font-bold tracking-wide text-fg uppercase">
                  {section.heading}
                </h2>
                {at === 0 ? action : null}
              </div>

              <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
                {section.rows.map((one) => (
                  <li key={one.id} className="contents">
                    <EventCard
                      church={session.tenantSlug}
                      event={one}
                      coverUrl={covers.get(one.id) ?? null}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
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
