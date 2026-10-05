import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ListOrdered } from "lucide-react";
import {
  withTenant, getOccurrence, listRoster, visitNumbers, canManageServices,
} from "@connectapp/db";
import { Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { PageMeta } from "@/components/section";
import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { Roster } from "./roster";
import { ServiceActions } from "./service-actions";

export const dynamic = "force-dynamic";

const readable = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

export default async function RosterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ church?: string }>;
}) {
  const { id } = await params;
  const { church } = await searchParams;
  const session = await requireSession(church);

  const result = await withTenant({ tenantId: session.tenantId, role: session.role }, async (tx) => {
    const occurrence = await getOccurrence(tx, id);
    if (!occurrence) return null;

    // Found by its readable address or by its id, so everything after this
    // works from the record's own id rather than from whatever was in the URL.
    const occurrenceId = occurrence.id;
    return {
      occurrence,
      roster: await listRoster(tx, occurrenceId),
      visits: await visitNumbers(tx, occurrenceId),
    };
  });

  if (!result) notFound();
  const { occurrence, roster, visits } = result;
  // R7.5. Counted from the record every time it is asked, rather than a flag
  // written once and wrong the moment somebody corrects a mistake.
  const visitOf = new Map(visits.map((v) => [v.memberId, v.visit]));

  return (
    <AppShell
      session={session}
      title={occurrence.name}
    >
      <Link
        href={`/services?church=${session.tenantSlug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-label text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" /> {t("roster.back")}
      </Link>

      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <PageMeta>{readable(occurrence.occursOn)}</PageMeta>
        {/* R11.1. The order of service, which is what a church runs the
            gathering from. */}
        {canManageServices(session) ? (
          <div className="flex flex-wrap items-center gap-2">
            <ServiceActions
              church={session.tenantSlug}
              id={occurrence.id}
              name={occurrence.name}
              date={readable(occurrence.occursOn)}
              cancelled={occurrence.status === "cancelled"}
            />
            <Button variant="secondary" asChild>
              <Link href={`/services/${occurrence.slug}/plan?church=${session.tenantSlug}`}>
                <ListOrdered /> {t("order.open")}
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <Roster
        church={session.tenantSlug}
        occurrenceId={occurrence.id}
        canEdit={canManageServices(session)}
        members={roster.map((r) => ({
          memberId: r.memberId,
          name: `${r.preferredName ?? r.firstName} ${r.lastName}`,
          surname: r.lastName,
          present: r.present,
          visit: visitOf.get(r.memberId) ?? 0,
        }))}
      />
    </AppShell>
  );
}
