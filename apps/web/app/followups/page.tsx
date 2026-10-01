import {
  withTenant, getChurch, myFollowUps, unassignedFollowUps, canFollowUp,
} from "@hearth/db";
import { Banner } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { AppHeader } from "@/components/app-header";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { Queue } from "./queue";

export const dynamic = "force-dynamic";

/**
 * R5.5. My follow-ups.
 *
 * Everything waiting on this person, late first. The PRD makes it the landing
 * page for the pastoral role, which is the right test of it: if this screen is
 * not worth opening on a Monday morning, the whole of F5 is a filing cabinet.
 */
export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canFollowUp(session.role)) {
    return (
      <>
        <AppHeader session={session} />
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <Banner tone="info" title={t("followups.title")}>{t("forbidden.askAdmin")}</Banner>
        </main>
      </>
    );
  }

  const { mine, loose, today } = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    async (tx) => ({
      mine: await myFollowUps(tx, session.userId),
      loose: await unassignedFollowUps(tx),
      today: churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago").date,
    }),
  );

  const shape = (rows: typeof mine) =>
    rows.map((row) => ({
      id: row.id,
      personId: row.personId,
      personName: row.personName,
      title: row.title,
      pipelineName: row.pipelineName,
      pipelineHue: row.pipelineHue,
      dueOn: row.dueOn,
    }));

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <PageTitle title={t("queue.title")} className="mb-6" />
        <Queue
          church={session.tenantSlug}
          today={today}
          mine={shape(mine)}
          loose={shape(loose)}
        />
      </main>
    </>
  );
}
