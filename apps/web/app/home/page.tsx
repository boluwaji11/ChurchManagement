import { CalendarDays, HandHeart, Users } from "lucide-react";
import { redirect } from "next/navigation";
import {
  withTenant, findGroups, personForUser, assignmentsForPerson,
  listEvents, listOccurrences, myChildren, canEditPeople, canReadIncidents,
  getChurch,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import {
  PortalShell, PortalTitle, PortalSection,
} from "@/components/portal-shell";
import { Block, Through, Thread, Quiet, SideThread, type Stop } from "./timeline";

/** R17.7. How many of this member's serving dates the side carries. */
const SERVING_ROWS = 4;

/** R14.1. How much of the church's diary the thread carries. */
const EVENT_ROWS = 5;
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { Respond } from "./schedule/respond";
import { CheckinCard } from "./checkin-card";
import { onDay, dayName, readableTime } from "./when";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("nav.home"), church);
}

/**
 * R17.1. The whole of the product for somebody who is not staff.
 *
 * What is being asked of them first, then what is theirs. A member signs in
 * two or three times a year, usually because the church asked them something,
 * so the thing waiting on an answer leads the screen. The week down the main
 * column, the standing facts down the side, which is the shape the redesign
 * draws.
 *
 * Giving is not here. Money is deferred, and R17.4 comes back with it.
 */
export default async function MemberHomePage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  // Staff have their own screens, and this is not one of them.
  if (canEditPeople(session) || canReadIncidents(session)) {
    redirect(`/dashboard?church=${session.tenantSlug}`);
  }

  const mine = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => {
      const self = await personForUser(tx, session.userId);
      // R17.1. The church's own clock. A member in another state opening this
      // at eleven at night should not be told the morning service is over.
      const profile = await getChurch(tx, session.tenantId);
      const now = churchNow(profile?.timezone ?? "America/Chicago");

      /*
       * R17.8. The next service today, which is the only one a parent is
       * checking in to. Nothing to check in to is the common case and the card
       * stays off the screen.
       */
      const today = await listOccurrences(tx, { from: now.date, to: now.date });
      const next = today.find((one) => one.status !== "cancelled") ?? null;

      /*
       * R17.1. The next service the church holds, today's or the one after.
       * The first question a member arrives with, and the screen answered it
       * nowhere.
       */
      const coming = (await listOccurrences(tx, { from: now.date }))
        .filter((one) => one.status !== "cancelled")
        .sort(
          (a, b) =>
            a.occursOn.localeCompare(b.occursOn) || a.startsAt.localeCompare(b.startsAt),
        )[0] ?? null;
      const actor = {
        tenantId: session.tenantId,
        role: session.role,
        userId: session.userId,
      };

      return {
        profile,
        coming,
        service: next,
        children: next ? await myChildren(tx, actor, next.id) : [],
        today: now.date,
        groups: (await findGroups(tx, { memberId: self })).filter((group) => group.mine),
        serving: self
          ? await assignmentsForPerson(tx, self, { from: now.date, limit: 6 })
          : [],
        // R14.2. Publishing is the gate, not listing. A draft's public page
        // answers 404 on purpose, so a card for one goes nowhere.
        events: (await listEvents(tx, { from: now.date }))
          .filter((one) => one.listed && one.status === "published")
          .slice(0, EVENT_ROWS),
      };
    },
  );

  const asked = mine.serving.filter((one) => one.status === "pending");
  const ahead = mine.serving.filter((one) => one.status === "accepted");
  const first = session.displayName.split(" ")[0] ?? session.displayName;
  const at = session.tenantSlug;

  /*
   * R14.1. The church's own diary, as one thread.
   *
   * The left of the screen is the church and the right is the member: what
   * the church has on, against what this person is themselves committed to.
   * Nothing appears on both sides.
   */
  const stops: Stop[] = mine.events.map((one) => ({
    id: one.id,
    hue: one.hue,
    icon: <CalendarDays />,
    when: `${onDay(one.startsOn)}${one.startsAt ? ` ${readableTime(one.startsAt)}` : ""}`,
    title: one.name,
    detail: one.location,
    href: `/events/${one.slug}?church=${at}`,
  }));

  const checkingIn = mine.service && mine.children.length > 0;

  return (
    <PortalShell session={session} tab={t("nav.home")}>
      <PortalTitle title={t("home.hello", { name: first })} />

      {/* R17.1. What the church is waiting on, first and on its own. It is
          the reason most members open this at all, and everything under it
          is theirs to read in their own time. */}
      {asked.length > 0 || checkingIn ? (
        <PortalSection title={t("home.needsYou")}>
          {checkingIn && mine.service ? (
            <CheckinCard
              church={at}
              occurrenceId={mine.service.id}
              serviceName={mine.service.name}
            >
              {mine.children}
            </CheckinCard>
          ) : null}

          {asked.map((one) => (
            <Block
              key={one.id}
              icon={<HandHeart />}
              title={t("home.servingAsked")}
              className="shadow-sm"
            >
              <Thread
                stops={[
                  {
                    id: one.id,
                    hue: one.teamHue,
                    icon: <HandHeart />,
                    when: `${onDay(one.occursOn)} ${readableTime(one.startsAt)}`,
                    title: one.positionName,
                    detail: one.teamName,
                    action: <Respond id={one.id} church={at} />,
                  },
                ]}
              />
            </Block>
          ))}
        </PortalSection>
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <Block
            icon={<CalendarDays />}
            title={t("home.coming")}
            action={<Through href={`/events?church=${at}`}>{t("home.allEvents")}</Through>}
          >
            {stops.length > 0 ? (
              <Thread stops={stops} />
            ) : (
              <Quiet>{t("home.coming.none")}</Quiet>
            )}
          </Block>
        </div>

        <aside className="flex w-full flex-col gap-6 lg:w-[320px] lg:shrink-0">
          {/* R17.7. When this member is next on, in their team's own colour.
              The next few rather than all of them: the rest is one press
              away and a column of twelve is not something anybody glances
              at. */}
          <Block
            icon={<HandHeart />}
            title={t("home.mySchedule")}
            action={
              ahead.length > 0
                ? <Through href={`/home/schedule?church=${at}`}>{t("home.seeAll")}</Through>
                : undefined
            }
          >
            {ahead.length > 0 ? (
              <SideThread
                rows={ahead.slice(0, SERVING_ROWS).map((one) => ({
                  id: one.id,
                  hue: one.teamHue,
                  label: one.positionName,
                  note: `${one.teamName} ${onDay(one.occursOn)} ${readableTime(one.startsAt)}`,
                }))}
              />
            ) : (
              <Quiet>{t("home.mySchedule.none")}</Quiet>
            )}
          </Block>

          <Block
            icon={<Users />}
            title={t("home.myGroups")}
            action={
              <Through href={`/groups?church=${at}`}>
                {mine.groups.length > 0 ? t("home.findAnother") : t("find.title")}
              </Through>
            }
          >
            {mine.groups.length > 0 ? (
              <SideThread
                rows={mine.groups.map((group) => ({
                  id: group.id,
                  hue: group.typeHue,
                  label: group.name,
                  note: group.dayOfWeek !== null ? `${dayName(group.dayOfWeek)}s` : null,
                  href: `/groups/${group.slug}?church=${at}`,
                }))}
              />
            ) : (
              <Quiet>{t("home.myGroups.none")}</Quiet>
            )}
          </Block>

        </aside>
      </div>
    </PortalShell>
  );
}
