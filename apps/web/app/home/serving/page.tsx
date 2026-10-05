import { redirect } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import {
  withTenant, personForUser, assignmentsForPerson, listBlockouts,
  canEditPeople, canReadIncidents,
} from "@connectapp/db";
import { Card } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { Respond } from "./respond";
import { Away } from "./away";
import { onDay, atTime } from "../when";

export const dynamic = "force-dynamic";

/** Where an assignment stands, as a word and a mark. */
const STATES = {
  pending: { key: "home.waiting", Icon: Clock, tone: "text-fg-muted" },
  accepted: { key: "home.accepted", Icon: CheckCircle2, tone: "text-success-text" },
  declined: { key: "home.declinedShort", Icon: XCircle, tone: "text-fg-subtle" },
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
      if (!self) return { schedule: [], away: [] };
      return {
        schedule: await assignmentsForPerson(tx, self, { from: now.date, limit: 20 }),
        away: await listBlockouts(tx, self, { from: now.date }),
      };
    },
  );

  return (
    <AppShell session={session} title={t("home.mySchedule")} density="portal" max="max-w-3xl">
      <div className="flex flex-col gap-7">
        <section className="flex flex-col gap-3">
          {mine.schedule.length === 0 ? (
            <p className="text-[length:var(--d-text-body)] text-fg-muted">
              {t("home.noSchedule")}
            </p>
          ) : (
            <Card className="flex flex-col divide-y divide-line p-0">
              {mine.schedule.map((one) => {
                const state = STATES[one.status];
                return (
                  <div key={one.id} className="flex flex-col gap-2 px-4 py-3.5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="w-[86px] shrink-0 text-[length:var(--d-text-body)] font-medium text-fg">
                        {onDay(one.occursOn)}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[length:var(--d-text-body)] font-medium text-fg">
                          {one.positionName}
                        </span>
                        <span className="truncate text-caption text-fg-muted">
                          {one.teamName} {atTime(one.startsAt)}
                        </span>
                      </span>
                      <span
                        className={`flex shrink-0 items-center gap-1.5 text-caption font-medium ${state.tone}`}
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
            </Card>
          )}
        </section>

        <Away dates={mine.away} church={session.tenantSlug} />
      </div>
    </AppShell>
  );
}
