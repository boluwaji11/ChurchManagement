import { CalendarDays, HandHeart, Users } from "lucide-react";
import { redirect } from "next/navigation";
import {
  withTenant, findGroups, personForUser, assignmentsForPerson,
  listEvents, listOccurrences, myChildren, canEditPeople, canReadIncidents,
  feedFor,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { PortalTitle, PortalSection } from "@/components/portal-shell";
import { Block, Through, Thread, Quiet, SideThread, type Stop } from "./timeline";
import { Notices } from "./notices";

/** R17.7. How many of this member's serving dates the side carries. */
const SERVING_ROWS = 4;

/** R14.1. How much of the church's diary the thread carries. */
const EVENT_ROWS = 5;

/** R16.11. How many notices the feed opens with. */
const NOTICE_ROWS = 4;
import { Screen } from "@/components/screen";
import { requireScreen, shellData } from "@/lib/shell-data";
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
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  return tabMetadata(t("nav.home"));
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
  searchParams: Promise<{ }>;
}) {
  const {} = await searchParams;
  const session = await requireScreen();

  // Staff have their own screens, and this is not one of them.
  if (canEditPeople(session) || canReadIncidents(session)) {
    redirect("/dashboard");
  }

  /*
   * R17.1. The church's own clock, out of the frame, which has already read
   * the church. A member in another state opening this at eleven at night
   * should not be told the morning service is over.
   */
  const profile = (await shellData(session)).church;
  const now = churchNow(profile?.timezone ?? "America/Chicago");

  const mine = await withTenant(
    {
      tenantId: session.tenantId,
      role: session.role,
      userId: session.userId,
      permissions: session.permissions,
    },
    async (tx) => {
      /*
       * Nine reads waited on each other on the one screen a member opens.
       * They fall into three groups: who is reading, what that answer is
       * needed for, and the children on the service the second group found.
       */
      const self = await personForUser(tx, session.userId);

      const actor = {
        tenantId: session.tenantId,
        role: session.role,
        userId: session.userId,
      };

      /*
       * R17.1, R17.8. One read of what is coming rather than two. The old
       * pair asked for today and then for today onwards, and the second
       * answer contained the first.
       */
      const [ahead, groups, serving, notices, events] = await Promise.all([
        listOccurrences(tx, { from: now.date }),
        /*
         * R9.5, R17.5. The ones they are in, and the ones they have asked
         * about. A member who presses Join and then sees nothing on their own
         * screen has no way to tell whether the church heard them, so the
         * group they asked for stands in the list with the answer pending.
         */
        findGroups(tx, { memberId: self }),
        self ? assignmentsForPerson(tx, self, { from: now.date, limit: 6 }) : [],
        /* R16.11. What the church has told everybody, which is the only
           thing in communication that reaches a member without the church
           holding anybody's credentials. */
        feedFor(tx, now.date, NOTICE_ROWS, session.userId),
        listEvents(tx, { from: now.date }),
      ]);

      const live = ahead.filter((one) => one.status !== "cancelled");

      /*
       * R17.8. The next service today, which is the only one a parent is
       * checking in to. Nothing to check in to is the common case and the card
       * stays off the screen.
       */
      const next = live.find((one) => one.occursOn === now.date) ?? null;

      /*
       * R17.1. The next service the church holds, today's or the one after.
       * The first question a member arrives with, and the screen answered it
       * nowhere.
       */
      const coming = [...live].sort(
        (a, b) =>
          a.occursOn.localeCompare(b.occursOn) || a.startsAt.localeCompare(b.startsAt),
      )[0] ?? null;

      return {
        profile,
        coming,
        service: next,
        children: next ? await myChildren(tx, actor, next.id) : [],
        today: now.date,
        groups: groups.filter((group) => group.mine || group.requested === "pending"),
        serving,
        notices,
        // R14.2. Publishing is the gate, not listing. A draft's public page
        // answers 404 on purpose, so a card for one goes nowhere.
        events: events
          .filter((one) => one.listed && one.status === "published")
          .slice(0, EVENT_ROWS),
      };
    },
  );

  const asked = mine.serving.filter((one) => one.status === "pending");
  const ahead = mine.serving.filter((one) => one.status === "accepted");
  const first = session.displayName.split(" ")[0] ?? session.displayName;

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
    href: `/events/${one.slug}`,
  }));

  const checkingIn = mine.service && mine.children.length > 0;

  return (
    <Screen>
      <PortalTitle title={t("home.hello", { name: first })} />

      {/* R17.1. What the church is waiting on, first and on its own. It is
          the reason most members open this at all, and everything under it
          is theirs to read in their own time. */}
      {asked.length > 0 || checkingIn ? (
        <PortalSection title={t("home.needsYou")}>
          {checkingIn && mine.service ? (
            <CheckinCard
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
                    action: <Respond id={one.id} />,
                  },
                ]}
              />
            </Block>
          ))}
        </PortalSection>
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* R16.11. What the church has said, above its diary: a notice is
              written because somebody needs to read it this week, and the
              diary is there whether or not anything was said. */}
          <Notices
            notices={mine.notices.map((one) => ({
              id: one.id,
              title: one.title,
              body: one.body,
              hue: one.hue,
            }))}
          />

          <Block
            icon={<CalendarDays />}
            title={t("home.coming")}
            action={<Through href={"/events"}>{t("home.allEvents")}</Through>}
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
                ? <Through href={"/home/schedule"}>{t("home.seeAll")}</Through>
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
              <Through href={"/groups"}>
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
                  note: group.mine
                    ? (group.dayOfWeek !== null ? `${dayName(group.dayOfWeek)}s` : null)
                    : t("home.groupAsked"),
                  href: `/groups/${group.slug}`,
                }))}
              />
            ) : (
              <Quiet>{t("home.myGroups.none")}</Quiet>
            )}
          </Block>

        </aside>
      </div>
    </Screen>
  );
}
