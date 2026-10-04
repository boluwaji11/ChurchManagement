import {
  withTenant, getChurch, listPipelines, peopleIn, canFollowUp,
} from "@hearth/db";
import { Banner } from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { shortDate } from "@/lib/dates";
import Link from "next/link";
import { Board, DragHint, type BoardCard, type BoardStage } from "./board";

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

  if (!canFollowUp(session.role)) {
    return (
      <AppShell session={session} title={t("queue.title")}>
        <Banner tone="info" title={t("followups.title")}>{t("forbidden.askAdmin")}</Banner>
      </AppShell>
    );
  }

  const { pipelines, entries, today } = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    async (tx) => {
      const all = await listPipelines(tx);
      const chosen = all.find((p) => p.id === params.pipeline) ?? all[0];
      return {
        pipelines: all,
        entries: chosen ? await peopleIn(tx, chosen.id) : [],
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

  const cards: BoardCard[] = entries.map((entry) => {
    const next = entry.steps.find((step) => step.doneAt === null);
    return {
      entryId: entry.id,
      personId: entry.personId,
      who: entry.personName,
      why: next?.title ?? entry.reason,
      owner: next?.dueOn
        ? t("board.due", { date: shortDate(next.dueOn) })
        : t("board.noDate"),
      stepId: next?.id ?? null,
      stage: next ? String(next.position) : "done",
      late: Boolean(next?.dueOn && next.dueOn < today),
    };
  });

  const overdue = cards.filter((c) => c.late).length;

  return (
    <AppShell session={session} title={t("queue.title")}>
      {/* A church runs several of these at once, and the design draws one. The
          pills are how you get to the others. */}
      {pipelines.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {pipelines.map((one) => (
            <Link
              key={one.id}
              href={`/followups?church=${session.tenantSlug}&pipeline=${one.id}`}
              aria-current={one.id === pipeline?.id ? "page" : undefined}
              className={`flex h-[34px] items-center rounded-full px-3.5 text-[13px] font-medium ${
                one.id === pipeline?.id
                  ? "border border-fg bg-fg text-canvas"
                  : "border border-line-strong bg-surface text-fg hover:bg-sunken"
              }`}
            >
              {one.name}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[28px] leading-[34px] text-fg">
            {pipeline?.name ?? t("queue.title")}
          </h2>
          <p className="mt-1 text-fg-muted">
            {[
              plural("board.inPipeline", cards.length),
              overdue > 0 ? plural("board.overdue", overdue) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <DragHint />
      </div>

      {pipeline ? (
        <Board church={session.tenantSlug} stages={stages} cards={cards} />
      ) : (
        <div className="rounded-lg border border-line bg-surface p-7 text-center text-fg-muted">
          {t("board.none.title")}
        </div>
      )}
    </AppShell>
  );
}
