import {
  withTenant, getChurch, listPipelines, boardEntries, CONNECTED_DAYS, canFollowUp,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { shortDate } from "@/lib/dates";
import { Board, DragHint, type BoardCard, type BoardStage } from "./board";
import { PipelinePicker } from "./pipeline-picker";
import { Denied } from "@/components/denied";

export const dynamic = "force-dynamic";

/**
 * R5.5. The follow-up board.
 *
 * A column per stage and a card per person, which is the shape a church already
 * thinks in: who has been contacted, who has a visit booked, who is connected.
 * Dragging a card forward marks the step it was waiting on as done.
 *
 * The PRD makes this the landing page for the pastoral role, which is the right
 * test of it: if it is not worth opening on a Monday morning, the whole of F5 is
 * a filing cabinet.
 */
export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; pipeline?: string }>;
}) {
  const params = await searchParams;
  const session = await requireSession(params.church);

  if (!canFollowUp(session)) {
    return (
      <AppShell session={session} title={t("queue.title")}>
        <Denied />
      </AppShell>
    );
  }

  const { pipelines, entries, today } = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    async (tx) => {
      const all = await listPipelines(tx);
      const chosen = all.find((p) => p.id === params.pipeline) ?? all[0];
      return {
        pipelines: all,
        entries: chosen
          ? await boardEntries(
              tx,
              chosen.id,
              new Date(Date.now() - CONNECTED_DAYS * 24 * 60 * 60 * 1000),
            )
          : [],
        today: churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago").date,
      };
    },
  );

  const pipeline = pipelines.find((p) => p.id === params.pipeline) ?? pipelines[0];

  /*
   * The stages are the pipeline's own steps, plus the one at the end for
   * everybody who has finished. A person's stage is the first step they have
   * not done, which is what "where are they up to" means.
   */
  const stages: BoardStage[] = pipeline
    ? [
        ...pipeline.steps.map((step, i) => ({
          // Keyed by position rather than id: a person's steps are their own
          // rows, copied from the template when they entered, so the ids differ
          // and only the order is shared.
          id: String(step.position),
          label: step.name,
          hue: ["amber", "citron", "teal", "sky", "indigo"][i % 5]!,
        })),
        { id: "done", label: t("board.connected"), hue: "fern" },
      ]
    : [];

  const cards: BoardCard[] = entries
    .map((entry) => {
      const next = entry.steps.find((step) => step.doneAt === null);
      return {
        entryId: entry.id,
        memberId: entry.memberId,
        personSlug: entry.personSlug,
        who: entry.personName,
        owner: next
          ? next.dueOn
            ? t("board.due", { date: shortDate(next.dueOn) })
            : t("board.noDate")
          : t("board.finished"),
        stepId: next?.id ?? null,
        stage: next ? String(next.position) : "done",
        late: Boolean(next?.dueOn && next.dueOn < today),
        dueOn: next?.dueOn ?? null,
      };
    })
    // Soonest first down every column, so the top card is the one to answer
    // next. Anybody with no date sits under the members who have one.
    .sort((a, b) => (a.dueOn ?? "9999-12-31").localeCompare(b.dueOn ?? "9999-12-31"));

  return (
    <AppShell session={session} title={t("queue.title")}>
      {/* The pipeline names itself, so the board carries no heading of its
          own. The hint sits beside the picker. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {pipelines.length > 1 ? (
          <PipelinePicker
            church={session.tenantSlug}
            pipelines={pipelines.map((one) => ({ id: one.id, name: one.name }))}
            current={pipeline?.id ?? ""}
          />
        ) : (
          <h2 className="font-display text-[22px] leading-[28px] text-fg">
            {pipeline?.name ?? t("queue.title")}
          </h2>
        )}
        <DragHint />
      </div>

      {pipeline ? (
        <Board
          church={session.tenantSlug}
          pipelineId={pipeline.id}
          stages={stages}
          cards={cards}
        />
      ) : (
        <div className="rounded-lg border border-line bg-surface p-7 text-center text-fg-muted">
          {t("board.none.title")}
        </div>
      )}
    </AppShell>
  );
}
