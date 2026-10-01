import Link from "next/link";
import { withTenant, getChurch, pipelineBoard, canFollowUp } from "@hearth/db";
import { Badge, Banner, Card, HueTag, type Hue } from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { AppHeader } from "@/components/app-header";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { FollowUpTabs } from "../tabs";

export const dynamic = "force-dynamic";

/**
 * R5.7. The board.
 *
 * Three numbers per pipeline: how many are in it, how long the one who has
 * waited longest has been waiting, and how much of it is late. A pastor looking
 * at this is asking where the church is dropping people, and a chart would
 * answer a different question.
 */
export default async function BoardPage({
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
          <Banner tone="info" title={t("queue.title")}>{t("forbidden.askAdmin")}</Banner>
        </main>
      </>
    );
  }

  const board = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    async (tx) => {
      const today = churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago").date;
      return pipelineBoard(tx, today);
    },
  );

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <PageTitle title={t("queue.title")} className="mb-6" />
        <FollowUpTabs church={session.tenantSlug} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {board.map((pipeline) => (
            <Card key={pipeline.pipelineId} className="relative flex flex-col gap-3">
              <HueTag hue={pipeline.hue as Hue}>{pipeline.name}</HueTag>

              <Link
                href={`/followups/board/${pipeline.pipelineId}?church=${session.tenantSlug}`}
                className="font-display text-display text-fg after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none"
              >
                {pipeline.open}
              </Link>

              <span className="flex flex-wrap items-center gap-2">
                {pipeline.overdue > 0 ? (
                  <Badge tone="danger">{plural("board.overdue", pipeline.overdue)}</Badge>
                ) : null}
                {pipeline.longestDays !== null ? (
                  <span className="text-caption text-fg-muted">
                    {plural("board.longest", pipeline.longestDays)}
                  </span>
                ) : null}
              </span>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
