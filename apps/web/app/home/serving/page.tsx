import { redirect } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import {
  withTenant, personForUser, assignmentsForPerson, listBlockouts, upcomingServices,
  canEditPeople, canReadIncidents,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { PortalShell, PortalTitle, Panel } from "@/components/portal-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { Respond } from "./respond";
import { Away, type AwayDay } from "./away";
import { onDay, readableTime } from "../when";

export const dynamic = "force-dynamic";

/** Where an assignment stands, as a word, a mark and a colour. */
const STATES = {
  pending: {
    key: "home.waiting", Icon: Clock,
    tone: "bg-hue-amber-100 text-hue-amber-700",
  },
  accepted: {
    key: "home.accepted", Icon: CheckCircle2,
    tone: "bg-hue-fern-100 text-hue-fern-700",
  },
  declined: {
    key: "home.declinedShort", Icon: XCircle,
    tone: "bg-sunken text-fg-muted",
  },
} as const;

/**
 * R17.7. A member's own serving: what is coming, and when they are away.
 *
 * The church's rota lives on /serving and belongs to the team lead. This is
 * the same data from the other side: their dates, their answer, and the days
 * they have said not to ask.
 */
export default async function MyServingPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);
  if (canEditPeople(session) || canReadIncidents(session)) {
    redirect(`/serving?church=${session.tenantSlug}`);
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
      const now = churchNow("America/Chicago");
      if (!self) return { schedule: [], away: [], services: [] };
      return {
        schedule: await assignmentsForPerson(tx, self, { from: now.date, limit: 20 }),
        away: await listBlockouts(tx, self, { from: now.date }),
        services: await upcomingServices(tx, { from: now.date, limit: 24 }),
      };
    },
  );

  /*
   * The days the church actually meets, each marked where a blockout already
   * covers it. Asking "which of these can you not do" is the question a member
   * is answering, so the days are the control rather than a date range form.
   */
  const seen = new Set<string>();
  const days: AwayDay[] = [];
  for (const service of mine.services) {
    if (seen.has(service.occursOn)) continue;
    seen.add(service.occursOn);
    const covering = mine.away.find(
      (one) => one.startsOn <= service.occursOn && one.endsOn >= service.occursOn,
    );
    days.push({
      on: service.occursOn,
      label: new Date(`${service.occursOn}T00:00:00`)
        .toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      blockoutId: covering?.id ?? null,
    });
    if (days.length === 8) break;
  }

  return (
    <PortalShell session={session}>
      <PortalTitle title={t("home.mySchedule")} />

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_460px] flex-col gap-4">
          {mine.schedule.length === 0 ? (
            <Panel>
              <p className="text-[length:var(--d-text-body)] text-fg-muted">
                {t("home.noSchedule")}
              </p>
            </Panel>
          ) : (
            <Panel className="flex flex-col divide-y divide-line px-5 py-0">
              {mine.schedule.map((one) => {
                const state = STATES[one.status];
                const when = new Date(`${one.occursOn}T00:00:00`);
                return (
                  <div key={one.id} className="flex flex-col gap-2.5 py-3.5">
                    <div className="flex flex-wrap items-center gap-3.5">
                      <span className="flex w-16 shrink-0 flex-col leading-[18px]">
                        <span className="text-caption font-medium text-fg-subtle">
                          {onDay(one.occursOn).split(",")[0]}
                        </span>
                        <span className="font-display text-[20px] leading-6 text-fg">
                          {when.toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                        </span>
                      </span>

                      <span className="flex min-w-[180px] flex-1 flex-col leading-5">
                        <span className="font-medium text-fg">{one.positionName}</span>
                        <span className="text-caption text-fg-muted">
                          {one.teamName} {readableTime(one.startsAt)}
                        </span>
                      </span>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-medium ${state.tone}`}
                      >
                        <state.Icon className="size-3.5" aria-hidden />
                        {t(state.key)}
                      </span>
                    </div>

                    {one.status === "pending" ? (
                      <Respond id={one.id} church={session.tenantSlug} />
                    ) : null}
                  </div>
                );
              })}
            </Panel>
          )}
        </div>

        <aside className="flex min-w-0 flex-[1_1_280px] flex-col">
          <Away days={days} church={session.tenantSlug} />
        </aside>
      </div>
    </PortalShell>
  );
}
