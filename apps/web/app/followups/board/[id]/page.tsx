import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import {
  withTenant, getChurch, listPipelines, peopleIn, canFollowUp,
} from "@hearth/db";
import { Badge, Banner, Card, EmptyState, HueTag, Separator, type Hue } from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { AppHeader } from "@/components/app-header";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";

export const dynamic = "force-dynamic";

const readable = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { day: "numeric", month: "long" });

const daysBetween = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  );

/**
 * R5.7. Who is in one, longest wait first.
 *
 * The number on the board is only useful if it opens into names. Somebody has
 * been in First visit for five weeks, and that is a person rather than a
 * statistic.
 */
export default async function PipelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { id } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canFollowUp(session.role)) {
    return (
      <>
        <AppHeader session={session} />
        <main id="main" className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <Banner tone="info" title={t("queue.title")}>{t("forbidden.askAdmin")}</Banner>
        </main>
      </>
    );
  }

  const { pipeline, entries, today } = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    async (tx) => ({
      pipeline: (await listPipelines(tx, { includeArchived: true })).find((p) => p.id === id),
      entries: await peopleIn(tx, id),
      today: churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago").date,
    }),
  );

  if (!pipeline) notFound();

  const waiting = [...entries].sort((a, b) => a.startedOn.localeCompare(b.startedOn));

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-caption text-fg-muted">
          <Link
            href={`/followups/board?church=${session.tenantSlug}`}
            className="rounded px-1 py-0.5 hover:text-fg"
          >
            {t("queue.board")}
          </Link>
          <ChevronRight className="size-4" aria-hidden />
          <span>{pipeline.name}</span>
        </nav>

        <h1 className="mb-6 font-display text-display text-fg">{pipeline.name}</h1>

        {waiting.length === 0 ? <EmptyState title={t("board.none.title")} /> : null}

        {waiting.length > 0 ? (
          <Card className="flex flex-col">
            {waiting.map((entry, i) => {
              const next = entry.steps.find((step) => step.doneAt === null);
              const late = next?.dueOn !== null && next?.dueOn !== undefined && next.dueOn < today;
              return (
                <div key={entry.id}>
                  {i > 0 ? <Separator className="my-3" /> : null}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex min-w-0 flex-col gap-1">
                      <Link
                        href={`/people/${entry.personId}?church=${session.tenantSlug}`}
                        className="text-[length:var(--d-text-body)] text-fg underline-offset-4 hover:underline"
                      >
                        {entry.personName}
                      </Link>
                      <span className="text-caption text-fg-muted">
                        {next ? next.title : t("followups.done")}
                        {next?.dueOn ? (
                          <span className={late ? "ml-2 text-danger" : "ml-2"}>
                            {readable(next.dueOn)}
                          </span>
                        ) : null}
                      </span>
                    </span>

                    <span className="flex flex-wrap items-center gap-2">
                      <HueTag hue={pipeline.hue as Hue}>
                        {plural("board.waiting", daysBetween(entry.startedOn, today))}
                      </HueTag>
                      {late ? <Badge tone="danger">{t("queue.late")}</Badge> : null}
                    </span>
                  </div>
                </div>
              );
            })}
          </Card>
        ) : null}
      </main>
    </>
  );
}
