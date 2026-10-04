import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, GripVertical } from "lucide-react";
import {
  withTenant, getOccurrence, getPlan, ensurePlan, addressableFor, canManageServices,
  listTemplates, recentPlans, rosterFor, listOccurrences, getChurch,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { longDate, readableTime, shortDate } from "@/lib/dates";
import { churchNow } from "@/lib/church-now";
import { Order } from "./order";
import { WhoServes } from "./who-serves";
import { PlanSide } from "./side";

export const dynamic = "force-dynamic";

/**
 * R11.1 to R11.3. The order of service for one gathering.
 *
 * Opening it creates it, because a church that generates a year of services
 * does not want a year of empty plans in every list and every export.
 */
export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { id } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canManageServices(session.role)) {
    redirect(`/services/${id}?church=${session.tenantSlug}`);
  }

  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId };

  const result = await withTenant(actor, async (tx) => {
    const occurrence = await getOccurrence(tx, id);
    if (!occurrence) return null;
    await ensurePlan(tx, actor, id);
    const plan = await getPlan(tx, id);
    if (!plan) return null;
    return {
      occurrence,
      plan,
      // R11.6. Who a note can be addressed to: the schedule for this gathering.
      audience: await addressableFor(tx, id),
      // R11.8. Shapes to start from: what the church has saved, and what it ran.
      templates: await listTemplates(tx),
      sources: await recentPlans(tx, id),
      // R11.9. Who serves, read from the same schedule the serving pages write.
      roster: await rosterFor(tx, id),
      // R11.1. The church's other gatherings, so a leader planning three in a
      // week moves between them without going back to the list.
      others: await listOccurrences(tx, {
        from: churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago").date,
        to: "2100-01-01",
      }),
    };
  });

  if (!result?.plan) notFound();
  const { occurrence, plan, audience, templates, sources, roster, others } = result;

  // R11.3. The clock the plan runs on, worked out the same way the order does.
  const [h, m] = occurrence.startsAt.split(":").map(Number);
  const minutes = plan.items.reduce((n, item) => n + item.minutes, 0);
  const ends = new Date();
  ends.setHours(h ?? 0, (m ?? 0) + minutes, 0, 0);

  const tabs = [...others]
    .sort((a, b) => a.occursOn.localeCompare(b.occursOn) || a.startsAt.localeCompare(b.startsAt))
    .slice(0, 6);

  return (
    <AppShell session={session} title={t("order.title")} wide>
      <div className="grid gap-6 lg:[grid-template-columns:minmax(0,1fr)_minmax(240px,280px)]">
        <div className="flex flex-col gap-4">
          <Link
            href={`/services?church=${session.tenantSlug}`}
            className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
          >
            <ArrowLeft className="size-4" /> {t("order.allServices")}
          </Link>

          {tabs.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {tabs.map((one) => (
                <Link
                  key={one.id}
                  href={`/services/${one.id}/plan?church=${session.tenantSlug}`}
                  aria-current={one.id === id ? "page" : undefined}
                  className={`flex shrink-0 flex-col rounded-md border px-3.5 py-2 ${
                    one.id === id
                      ? "border-primary bg-primary-soft"
                      : "border-line bg-surface hover:border-line-strong"
                  }`}
                >
                  <span className="whitespace-nowrap text-[12px] font-medium text-fg-subtle">
                    {shortDate(one.occursOn)} · {readableTime(one.startsAt)}
                  </span>
                  <span className="whitespace-nowrap font-semibold text-fg">{one.name}</span>
                </Link>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-[28px] leading-[34px] text-fg">
                {`${longDate(occurrence.occursOn)} · ${readableTime(occurrence.startsAt)}`}
              </h2>
              {plan.theme ? <p className="mt-1 text-fg-muted">{plan.theme}</p> : null}
            </div>
            <span className="flex items-center gap-1.5 text-[12px] text-fg-subtle">
              <GripVertical className="size-3.5" aria-hidden /> {t("order.dragHint")}
            </span>
          </div>

          <Order
            church={session.tenantSlug}
            occurrenceId={id}
            planId={plan.id}
            serviceStartsAt={plan.serviceStartsAt}
            series={plan.series}
            theme={plan.theme}
            items={plan.items.map((item) => ({
              id: item.id,
              kind: item.kind,
              title: item.title,
              description: item.description,
              minutes: item.minutes,
              notes: item.notes.map((note) => ({
                id: note.id,
                body: note.body,
                audience: note.audience,
              })),
              files: item.files.map((file) => ({
                id: file.id,
                key: file.key,
                label: file.label,
                contentType: file.contentType,
              })),
            }))}
            audience={audience}
            templates={templates}
            sources={sources.map((source) => ({
              occurrenceId: source.occurrenceId,
              label: `${source.name}, ${longDate(source.occursOn)}`,
              items: source.items,
              minutes: source.minutes,
            }))}
          />

          <WhoServes church={session.tenantSlug} occurrenceId={id} teams={roster} />
        </div>

        <PlanSide
          church={session.tenantSlug}
          occurrenceId={id}
          minutes={minutes}
          endsAt={ends.toLocaleTimeString(undefined, {
            hour: "numeric", minute: "2-digit", hour12: true,
          })}
          teams={roster}
          canPrint={plan.items.length > 0}
        />
      </div>
    </AppShell>
  );
}
