import { redirect } from "next/navigation";
import { CalendarCheck, HandHeart } from "lucide-react";
import {
  withTenant, personForUser, assignmentsForPerson, listBlockouts,
  canEditPeople, canReadIncidents,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { PortalShell, PortalTitle } from "@/components/portal-shell";
import { Block, Thread, DateMark, Quiet } from "../timeline";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { Respond } from "./respond";
import { Away } from "./away";
import { readableTime } from "../when";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("home.mySchedule"), church);
}

/**
 * R17.7. A member's own serving: what is coming, and when they are away.
 *
 * The church's schedule lives on /serving and belongs to the team lead. This is
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
    redirect(`/schedule?church=${session.tenantSlug}`);
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

  const asked = mine.schedule.filter((one) => one.status === "pending");
  const ahead = mine.schedule.filter((one) => one.status !== "pending");

  return (
    <PortalShell session={session} tab={t("home.mySchedule")}>
      <PortalTitle title={t("home.mySchedule")} />

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_460px] flex-col gap-6">
          {/* R17.7. What the church is waiting on, first and on its own. It
              is the only thing on this screen that asks for a press. */}
          {asked.length > 0 ? (
            <Block icon={<HandHeart />} title={t("home.needsYou")} className="shadow-sm">
              <Thread
                wide
                stops={asked.map((one) => ({
                  id: one.id,
                  hue: one.teamHue,
                  icon: <HandHeart />,
                  mark: <DateMark iso={one.occursOn} hue={one.teamHue} />,
                  when: `${one.teamName} ${readableTime(one.startsAt)}`,
                  title: one.positionName,
                  action: <Respond id={one.id} church={session.tenantSlug} />,
                }))}
              />
            </Block>
          ) : null}

          <Block icon={<CalendarCheck />} title={t("home.serving")}>
            {ahead.length > 0 ? (
              <Thread
                wide
                stops={ahead.map((one) => ({
                  id: one.id,
                  hue: one.teamHue,
                  icon: <HandHeart />,
                  mark: <DateMark iso={one.occursOn} hue={one.teamHue} />,
                  when: `${one.teamName} ${readableTime(one.startsAt)}`,
                  title: one.positionName,
                  /* R17.7. A date they turned down keeps its word, because the
                     list is otherwise a list of things they are doing. Nothing
                     is said on the ones they are, since the heading says it. */
                  detail: one.status === "declined" ? t("home.declinedShort") : null,
                }))}
              />
            ) : (
              <Quiet>{t("home.noSchedule")}</Quiet>
            )}
          </Block>
        </div>

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col">
          <Away dates={mine.away} church={session.tenantSlug} />
        </aside>
      </div>
    </PortalShell>
  );
}
