import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  withTenant, listTeams, getTeam, getChurch, answerCounts, listOccurrences,
  assignmentsForTeam, blockoutsFor, openSlots, positionsForTeams,
  canManageTeams, canLeadTeams,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { Denied } from "@/components/denied";
import { churchNow } from "@/lib/church-now";
import { photoUrls } from "@/lib/photos";
import { shortDate, readableTime } from "@/lib/dates";
import { ServingViews } from "./views";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("serving.title"), church);
}

/** One of the three controls that move the schedule a month at a time. */
function MonthStep({
  church,
  at,
  team,
  label,
  children,
}: {
  church: string;
  at: string;
  team?: string;
  label: string;
  children: React.ReactNode;
}) {
  const query = new URLSearchParams({ church, at, ...(team ? { team } : {}) });
  return (
    <Link
      href={`/schedule?${query.toString()}`}
      aria-label={label}
      className="grid size-8 place-items-center rounded-sm border border-line-strong bg-surface"
    >
      {children}
    </Link>
  );
}

/** How many services the grid shows. A month of weekends, as the design draws. */
const COLUMNS = 4;

/**
 * R10.1, R10.3. Serving: the schedule, and the teams that fill it.
 *
 * A volunteer serves across the church, so this is one screen for every team
 * rather than a schedule held inside each ministry. The schedule leads, because
 * that is what somebody opens this on a Tuesday to do.
 */
export default async function ServingPage({
  searchParams,
}: {
  searchParams: Promise<{
    church?: string; archived?: string; team?: string; at?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await requireSession(params.church);

  if (!canLeadTeams(session)) {
    return (
      <Denied role={session.role} action="schedule" church={session.tenantSlug} />
      
    );
  }

  const canManage = canManageTeams(session);
  const showArchived = canManage && params.archived === "1";
  const asked = /^\d{4}-\d{2}$/.test(params.at ?? "") ? params.at! : null;

  const data = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const profile = await getChurch(tx, session.tenantId);
      const clock = churchNow(profile?.timezone ?? "America/Chicago");
      const found = await listTeams(tx, { includeArchived: showArchived });
      const live = found.filter((one) => one.archivedAt === null);

      // R10.1. Found by its readable name or by its id, so a link somebody sent
      // before a team had a name in its address goes on working.
      const chosen = live.find((one) => one.slug === params.team || one.id === params.team)
        ?? live[0] ?? null;

      /*
       * R10.3. A month at a time. The month in the URL, so a leader planning
       * December can send somebody the link to it.
       */
      const month = asked ?? clock.date.slice(0, 7);
      const [y, m] = month.split("-").map(Number);
      const last = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
      const services = (
        await listOccurrences(tx, {
          from: `${month}-01`,
          to: `${month}-${String(last).padStart(2, "0")}`,
        })
      )
        .sort(
          (a, b) =>
            a.occursOn.localeCompare(b.occursOn) || a.startsAt.localeCompare(b.startsAt),
        )
        .slice(0, COLUMNS);

      const team = chosen ? await getTeam(tx, chosen.id) : null;
      const slots =
        chosen && services.length > 0
          ? await assignmentsForTeam(tx, chosen.id, services.map((one) => one.id))
          : [];

      // R10.4. Who is away across these dates, and how much each of them is
      // already doing, read once for the whole grid.
      const members = team?.members.map((one) => one.memberId) ?? [];
      const away = services.length
        ? await blockoutsFor(tx, members, {
            from: services[0]!.occursOn,
            to: services[services.length - 1]!.occursOn,
          })
        : [];

      return {
        clock,
        month,
        teams: found,
        live,
        chosen,
        team,
        services,
        slots,
        away,
        counts: await answerCounts(tx, {
          teamIds: found.map((one) => one.id),
          from: clock.date,
        }),
        // R10.3. What is still to fill, team by team, across these dates.
        open: await openSlots(tx, services.map((one) => one.id)),
        // R10.2. What each team is made of, for the cards.
        positions: await positionsForTeams(tx, found.map((one) => one.id)),
      };
    },
  );

  const openOf = (teamId: string) => data.open[teamId] ?? 0;

  // R2.9. The faces in the picker of who could fill a slot.
  const faces = await photoUrls((data.team?.members ?? []).map((one) => one.photoKey));

  const month = new Date(`${data.month}-01T00:00:00`).toLocaleDateString(undefined, {
    month: "long",
    ...(data.month.slice(0, 4) === data.clock.date.slice(0, 4) ? {} : { year: "numeric" }),
  });

  const shiftMonth = (by: number) => {
    const [y, m] = data.month.split("-").map(Number);
    const at = new Date(Date.UTC(y!, m! - 1 + by, 1));
    return `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, "0")}`;
  };

  /*
   * R10.6. Scheduling somebody is the request: the slot goes down as waiting
   * for a reply and carries the link they answer on. There is nothing to send
   * separately.
   */
  return (
    <AppShell session={session} title={t("serving.title")} wide>
      <ServingViews
        church={session.tenantSlug}
        canManage={canManage}
        heading={
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-[22px] leading-[28px] text-fg">
              {t("serving.schedule.title", { month })}
            </h2>

            <span className="flex items-center gap-2">
                <MonthStep
                  church={session.tenantSlug}
                  at={shiftMonth(-1)}
                  team={data.chosen?.slug}
                  label={t("serving.earlier")}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </MonthStep>
                <MonthStep
                  church={session.tenantSlug}
                  at={data.clock.date.slice(0, 7)}
                  team={data.chosen?.slug}
                  label={t("serving.now")}
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{
                      background:
                        data.month === data.clock.date.slice(0, 7)
                          ? "var(--color-fg)"
                          : "var(--color-fg-subtle)",
                    }}
                  />
                </MonthStep>
                <MonthStep
                  church={session.tenantSlug}
                  at={shiftMonth(1)}
                  team={data.chosen?.slug}
                  label={t("serving.later")}
                >
                  <ChevronRight className="size-4" aria-hidden />
                </MonthStep>
            </span>
          </div>
        </div>

        {/* R10.6. What the three marks in the grid mean. */}
        <div className="flex flex-wrap gap-3.5 text-[12px] text-fg-muted">
          {[
            ["accepted", "fern"],
            ["waiting", "amber"],
            ["declined", "rose"],
          ].map(([what, hue]) => (
            <span key={what} className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ background: `var(--hue-${hue}-500)` }}
              />
              {t(`serving.legend.${what}` as never)}
            </span>
          ))}
        </div>
      </div>
        }
        schedule={
          data.chosen && data.team && data.services.length > 0
            ? {
                teams: data.live.map((one) => ({
                  id: one.id,
                  slug: one.slug,
                  name: one.name,
                  hue: one.hue,
                  open: openOf(one.id),
                })),
                team: {
                  id: data.chosen.id,
                  slug: data.chosen.slug,
                  name: data.chosen.name,
                  hue: data.chosen.hue,
                  open: openOf(data.chosen.id),
                },
                positions: data.team.positions.map((one) => ({
                  id: one.id,
                  name: one.name,
                  needed: one.needed,
                })),
                services: data.services.map((one) => {
                  const twice =
                    data.services.filter((x) => x.occursOn === one.occursOn).length > 1;
                  return {
                    id: one.id,
                    label: twice
                      ? `${shortDate(one.occursOn)}, ${readableTime(one.startsAt)}`
                      : shortDate(one.occursOn),
                  };
                }),
                slots: data.services.flatMap((service) =>
                  data.team!.positions.map((position) => {
                    const held = data.slots.find(
                      (one) =>
                        one.occurrenceId === service.id && one.positionId === position.id,
                    );
                    const blocked = held
                      ? data.away.find(
                          (one) =>
                            one.memberId === held.memberId &&
                            one.startsOn <= service.occursOn &&
                            one.endsOn >= service.occursOn,
                        )
                      : undefined;

                    return {
                      positionId: position.id,
                      occurrenceId: service.id,
                      assignmentId: held?.id ?? null,
                      personName: held?.personName ?? null,
                      status: held?.status ?? null,
                      warning: blocked ? t("serving.blockedOut") : null,
                    };
                  }),
                ),
                volunteers: data.team.members.map((one) => {
                  const off = data.away.find((x) => x.memberId === one.memberId);
                  return {
                    memberId: one.memberId,
                    name: one.name,
                    photoUrl: one.photoKey ? (faces[one.photoKey] ?? null) : null,
                    note: off ? t("serving.away", { date: shortDate(off.startsOn) }) : "",
                    away: Boolean(off),
                  };
                }),
              }
            : null
        }
      />
    </AppShell>
  );
}
