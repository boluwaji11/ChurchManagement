import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, getOccurrence, getPlan, ensurePlan, addressableFor, canManageServices,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { longDate, readableTime } from "@/lib/dates";
import { Order } from "./order";

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
    return {
      occurrence,
      plan: await getPlan(tx, id),
      // R11.6. Who a note can be addressed to: the schedule for this gathering.
      audience: await addressableFor(tx, id),
    };
  });

  if (!result?.plan) notFound();
  const { occurrence, plan, audience } = result;

  return (
    <>
      <AppHeader session={session} />
      <main id="main" className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href={`/services/${id}?church=${session.tenantSlug}`}
          className="mb-6 inline-flex items-center gap-1.5 text-label text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" /> {occurrence.name}
        </Link>

        <PageTitle
          title={t("order.title")}
          lede={`${longDate(occurrence.occursOn)} ${readableTime(occurrence.startsAt)}`}
          className="mb-8"
        />

        <Order
          church={session.tenantSlug}
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
          }))}
          audience={audience}
        />
      </main>
    </>
  );
}
