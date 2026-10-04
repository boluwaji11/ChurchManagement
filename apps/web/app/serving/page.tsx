import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import {
  withTenant, listTeams, getTeam, getChurch, answerCounts, listOccurrences,
  assignmentsForTeam, assignmentsForPerson, blockoutsFor, openSlots,
  canManageTeams, canLeadTeams,
} from "@hearth/db";
import { Button } from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { shortDate, readableTime } from "@/lib/dates";
import { Teams } from "./teams";
import { ServingViews } from "./views";
import { SendRequests } from "./send-requests";

export const dynamic = "force-dynamic";

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
      href={`/serving?${query.toString()}`}
      aria-label={label}
      className="grid size-8 place-items-center rounded-sm border border-line-strong bg-surface"
    >
      {children}
    </Link>
  );
}

/** How many gatherings the grid shows. A month of weekends, as the design draws. */
const COLUMNS = 4;

/**
 * R10.1, R10.3. Serving: the rota, and the teams that fill it.
 *
 * A volunteer serves across the church, so this is one screen for every team
 * rather than a schedule held inside each ministry. The rota leads, because
 * that is what somebody opens this on a Tuesday to do.
 */
export default async function ServingPage({
  searchParams,
}: {
  searchParams: Promise<{
    church?: string; archived?: string; view?: string; team?: string; at?: string;
  }>;
}) {
  const params = await searchParams;
  const session = await requireSession(params.church);

  if (!canLeadTeams(session.role)) {
    redirect(`/home?church=${session.tenantSlug}`);
  }

  const canManage = canManageTeams(session.role);
  const showArchived = canManage && params.archived === "1";
  const view = params.view === "teams" ? "teams" : "schedule";
  const asked = /^\d{4}-\d{2}$/.test(params.at ?? "") ? params.at! : null;

  const data = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    async (tx) => {
      const profile = await getChurch(tx, session.tenantId);
      const clock = churchNow(profile?.timezone ?? "America/Chicago");
      const found = await listTeams(tx, { includeArchived: showArchived });
      const live = found.filter((one) => one.archivedAt === null);

      const chosen = live.find((one) => one.id === params.team) ?? live[0] ?? null;

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
      const people = team?.members.map((one) => one.personId) ?? [];
      const away = services.length
        ? await blockoutsFor(tx, people, {
            from: services[0]!.occursOn,
            to: services[services.length - 1]!.occursOn,
          })
        : [];

      const load = new Map<string, number>();
      for (const personId of people) {
        const mine = await assignmentsForPerson(tx, personId, { from: clock.date });
        load.set(personId, mine.length);
      }

      // R10.6. Every slot waiting on a reply, across the teams and the dates
      // on screen, which is what the Send requests dialog asks about.
      const pending = services.length
        ? (
            await Promise.all(
              live.map(async (one) => {
                const rows = await assignmentsForTeam(
                  tx,
                  one.id,
                  services.map((x) => x.id),
                );
                return rows
                  .filter((row) => row.status === "pending")
                  .map((row) => ({ team: one.name, row }));
              }),
            )
          ).flat()
        : [];

      return {
        clock,
        month,
        pending,
        teams: found,
        live,
        chosen,
        team,
        services,
        slots,
        away,
        load,
        counts: await answerCounts(tx, {
          teamIds: found.map((one) => one.id),
          from: clock.date,
        }),
        // R10.3. What is still to fill, team by team, across these dates.
        open: await openSlots(tx, services.map((one) => one.id)),
      };
    },
  );

  const openOf = (teamId: string) => data.open[teamId] ?? 0;

  const waiting = Object.values(data.counts).reduce((n, one) => n + one.pending, 0);
  const stillOpen = data.live.reduce((n, one) => n + openOf(one.id), 0);

  const month = new Date(`${data.month}-01T00:00:00`).toLocaleDateString(undefined, {
    month: "long",
    ...(data.month.slice(0, 4) === data.clock.date.slice(0, 4) ? {} : { year: "numeric" }),
  });

  const shiftMonth = (by: number) => {
    const [y, m] = data.month.split("-").map(Number);
    const at = new Date(Date.UTC(y!, m! - 1 + by, 1));
    return `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, "0")}`;
  };

  const action =
    view === "teams" ? (
      canManage ? (
        <Button asChild>
          <Link href={`/serving?church=${session.tenantSlug}&view=teams&add=1`}>
            <Plus /> {t("serving.addTeam")}
          </Link>
        </Button>
      ) : undefined
    ) : (
      <SendRequests
        church={session.tenantName}
        waiting={data.pending.map(({ team, row }) => ({
          assignmentId: row.id,
          personName: row.personName,
          slot: t("serving.send.slot", {
            position: row.positionName,
            team,
            date: shortDate(
              data.services.find((one) => one.id === row.occurrenceId)?.occursOn ?? "",
            ),
          }),
        }))}
        trigger={
          <Button>
            <Plus /> {t("serving.send")}
          </Button>
        }
      />
    );

  return (
    <AppShell session={session} title={t("serving.title")} action={action} wide>
      <ServingViews
        church={session.tenantSlug}
        view={view}
        canManage={canManage}
        heading={
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-[28px] leading-[34px] text-fg">
              {view === "teams"
                ? t("serving.view.teams")
                : t("serving.schedule.title", { month })}
            </h2>

            {view === "schedule" ? (
              <span className="flex items-center gap-2">
                <MonthStep
                  church={session.tenantSlug}
                  at={shiftMonth(-1)}
                  team={data.chosen?.id}
                  label={t("serving.earlier")}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </MonthStep>
                <MonthStep
                  church={session.tenantSlug}
                  at={data.clock.date.slice(0, 7)}
                  team={data.chosen?.id}
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
                  team={data.chosen?.id}
                  label={t("serving.later")}
                >
                  <ChevronRight className="size-4" aria-hidden />
                </MonthStep>
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-fg-muted">
            {view === "teams"
              ? plural("serving.teamCount", data.live.length)
              : [
                  plural("serving.schedule.open", stillOpen),
                  waiting > 0 ? t("serving.schedule.waiting", { count: waiting }) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </p>
        </div>

        {/* R10.6. What the three marks in the grid mean. */}
        {view === "schedule" ? (
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
        ) : null}
      </div>
        }
        schedule={
          data.chosen && data.team && data.services.length > 0
            ? {
                teams: data.live.map((one) => ({
                  id: one.id,
                  name: one.name,
                  hue: one.hue,
                  open: openOf(one.id),
                })),
                team: {
                  id: data.chosen.id,
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
                            one.personId === held.personId &&
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
                  const off = data.away.find((x) => x.personId === one.personId);
                  return {
                    personId: one.personId,
                    name: one.name,
                    note: off
                      ? t("serving.away", { date: shortDate(off.startsOn) })
                      : plural("serving.servingTimes", data.load.get(one.personId) ?? 0),
                    away: Boolean(off),
                  };
                }),
              }
            : null
        }
        teams={
          <Teams
            church={session.tenantSlug}
            canManage={canManage}
            teams={data.teams.map((team) => ({
              id: team.id,
              name: team.name,
              description: team.description,
              hue: team.hue,
              members: team.members,
              positions: team.positions,
              needsChecks: team.needsChecks,
              archived: team.archivedAt !== null,
              answers: data.counts[team.id] ?? { pending: 0, accepted: 0, declined: 0 },
            }))}
          />
        }
      />
    </AppShell>
  );
}
