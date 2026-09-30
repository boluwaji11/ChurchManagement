import { withTenant, listOccurrences, canManageServices } from "@hearth/db";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/app-header";
import { Calendar } from "./calendar";

export const dynamic = "force-dynamic";

const readableDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

const readableTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  const rows = await withTenant({ tenantId: session.tenantId, role: session.role }, (tx) =>
    listOccurrences(tx, { includeCancelled: true }),
  );

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <PageTitle title={t("services.title")} lede={session.tenantName} />
        <Calendar
          church={session.tenantSlug}
          canEdit={canManageServices(session.role)}
          rows={rows.map((r) => ({
            id: r.id,
            name: r.name,
            occursOn: r.occursOn,
            startsAt: r.startsAt,
            status: r.status,
            note: r.note,
            special: r.serviceTimeId === null,
            readableDate: readableDate(r.occursOn),
            readableTime: readableTime(r.startsAt),
          }))}
        />
      </main>
    </>
  );
}
