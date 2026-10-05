import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, getOccurrence, getPlan, ensurePlan, canManageServices,
  listTemplates, recentPlans, rosterFor, listOccurrences, getChurch,
} from "@connectapp/db";
import { t } from "@connectapp/i18n";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { longDate, readableTime, shortDate } from "@/lib/dates";
import { churchNow } from "@/lib/church-now";
import { Order } from "./order";
import { PlanSide } from "./side";
import { PlanTabs } from "./tabs";

export const dynamic = "force-dynamic";

/**
 * R11.1 to R11.3. The order of service for one service.
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

  if (!canManageServices(session)) {
    redirect(`/services/${id}?church=${session.tenantSlug}`);
  }

  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions };

  const result = await withTenant(actor, async (tx) => {
    const occurrence = await getOccurrence(tx, id);
    if (!occurrence) return null;

    // Found by its readable address or by its id, so everything after this
    // works from the record's own id rather than from whatever was in the URL.
    const occurrenceId = occurrence.id;
    await ensurePlan(tx, actor, occurrenceId);
    const plan = await getPlan(tx, occurrenceId);
    if (!plan) return null;
    return {
      occurrence,
      plan,
      // R11.8. Shapes to start from: what the church has saved, and what it ran.
      templates: await listTemplates(tx),
      sources: await recentPlans(tx, occurrenceId),
      // R11.9. Who serves, read from the same schedule the serving pages write.
      roster: await rosterFor(tx, occurrenceId),
      // R11.1. The church's other services, so a leader planning three in a
      // week moves between them without going back to the list.
      others: await listOccurrences(tx, {
        from: churchNow((await getChurch(tx, session.tenantId))?.timezone ?? "America/Chicago").date,
        to: "2100-01-01",
      }),
    };
  });

  if (!result?.plan) notFound();
  const { occurrence, plan, templates, sources, roster, others } = result;

  // R11.3. The clock the plan runs on, worked out the same way the order does.
  const [h, m] = occurrence.startsAt.split(":").map(Number);
  const minutes = plan.items.reduce((n, item) => n + item.minutes, 0);
  const ends = new Date();
  ends.setHours(h ?? 0, (m ?? 0) + minutes, 0, 0);

  // The one being read is always a tab, even once it has happened, so the
  // strip never loses the plan it is sitting on.
  // Compared on the record's id rather than on what was in the URL, which may
  // be the readable address and then matched nothing, putting this service
  // in the row twice.
  const tabs = [
    ...(others.some((one) => one.id === occurrence.id) ? [] : [occurrence]),
    ...others,
  ].sort((a, b) => a.occursOn.localeCompare(b.occursOn) || a.startsAt.localeCompare(b.startsAt));

  return (
    <AppShell session={session} title={t("order.title")} wide>
      {/* The heading block runs the width, and the sidebar starts level with
          the first item rather than with the back link. */}
      <div className="grid gap-x-6 gap-y-6 lg:[grid-template-columns:minmax(0,1fr)_minmax(240px,280px)]">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Link
            href={`/services?church=${session.tenantSlug}`}
            className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
          >
            <ArrowLeft className="size-4" /> {t("order.allServices")}
          </Link>

          {tabs.length > 1 ? (
            <PlanTabs
              church={session.tenantSlug}
              current={id}
              tabs={tabs.map((one) => ({
                id: one.id,
                slug: one.slug,
                when: `${shortDate(one.occursOn)} · ${readableTime(one.startsAt)}`,
                name: one.name,
              }))}
            />
          ) : null}

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-[22px] leading-[28px] text-fg">
                {`${longDate(occurrence.occursOn)} · ${readableTime(occurrence.startsAt)}`}
              </h2>
              {plan.theme ? <p className="mt-1 text-fg-muted">{plan.theme}</p> : null}
            </div>
          </div>

        </div>

        <div className="flex flex-col gap-6">
          <Order
            church={session.tenantSlug}
            occurrenceId={occurrence.slug}
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
            templates={templates}
            sources={sources.map((source) => ({
              occurrenceId: source.occurrenceId,
              label: `${source.name}, ${longDate(source.occursOn)}`,
              items: source.items,
              minutes: source.minutes,
            }))}
          />
        </div>

        <PlanSide
          church={session.tenantSlug}
          occurrenceId={occurrence.slug}
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
