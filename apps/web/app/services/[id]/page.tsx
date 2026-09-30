import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  withTenant, getOccurrence, listRoster, visitNumbers, canManageServices,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { Roster } from "./roster";

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
    return {
      occurrence,
      roster: await listRoster(tx, id),
      visits: await visitNumbers(tx, id),
    };
  });

  if (!result) notFound();
  const { occurrence, roster, visits } = result;
  // R7.5. Counted from the record every time it is asked, rather than a flag
  // written once and wrong the moment somebody corrects a mistake.
  const visitOf = new Map(visits.map((v) => [v.personId, v.visit]));

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href={`/services?church=${session.tenantSlug}`}
          className="mb-6 inline-flex items-center gap-1.5 text-label text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" /> {t("roster.back")}
        </Link>

        <PageTitle
          title={occurrence.name}
          lede={`${readable(occurrence.occursOn)}`}
        />

        <Roster
          church={session.tenantSlug}
          occurrenceId={occurrence.id}
          canEdit={canManageServices(session.role)}
          people={roster.map((r) => ({
            personId: r.personId,
            name: `${r.preferredName ?? r.firstName} ${r.lastName}`,
            surname: r.lastName,
            present: r.present,
            visit: visitOf.get(r.personId) ?? 0,
          }))}
        />
      </main>
    </>
  );
}
