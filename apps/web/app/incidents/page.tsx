import { withTenant, listIncidents, canReadIncidents, type Incident } from "@hearth/db";
import { Badge, Banner, Card, EmptyState, Separator } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { PageTitle } from "@/components/section";
import { AppHeader } from "@/components/app-header";
import { requireSession } from "@/lib/session";
import { Notify } from "./notify";

export const dynamic = "force-dynamic";

const day = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

/**
 * R8.13. What has been written down, for the people who handle it.
 *
 * A separate screen from the station on purpose. The volunteer files a report
 * and never sees this: it names other volunteers, and other children's
 * incidents sit beside it.
 */
export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  const session = await requireSession(church);

  if (!canReadIncidents(session.role)) {
    return (
      <>
        <AppHeader session={session} />
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <Banner tone="info" title={t("incident.title")}>{t("forbidden.askAdmin")}</Banner>
        </main>
      </>
    );
  }

  const incidents = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    (tx) => listIncidents(tx, { role: session.role }),
  );

  return (
    <>
      <AppHeader session={session} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <PageTitle title={t("incident.title")} className="mb-6" />

        {incidents.length === 0 ? (
          <EmptyState title={t("incident.none.title")} />
        ) : (
          <div className="flex flex-col gap-4">
            {incidents.map((incident) => (
              <Report key={incident.id} church={session.tenantSlug} incident={incident} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function Report({ church, incident }: { church: string; incident: Incident }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-heading text-fg">{incident.personName}</span>
        <span className="text-caption text-fg-muted">{day(incident.occurredOn)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {incident.roomName ? <Badge tone="neutral">{incident.roomName}</Badge> : null}
        {incident.serviceName ? <Badge tone="neutral">{incident.serviceName}</Badge> : null}
        {incident.guardianNotified ? (
          <Badge tone="success">
            {t("incident.toldOn", {
              on: incident.notifiedAt ? day(incident.notifiedAt.toISOString().slice(0, 10)) : "",
            })}
          </Badge>
        ) : (
          <Badge tone="warning">{t("incident.notTold")}</Badge>
        )}
      </div>

      <Separator />

      <p className="whitespace-pre-wrap text-[length:var(--d-text-body)] text-fg">
        {incident.description}
      </p>
      <p className="whitespace-pre-wrap text-[length:var(--d-text-body)] text-fg-muted">
        {incident.action}
      </p>

      {incident.volunteers ? (
        <p className="text-caption text-fg-muted">{incident.volunteers}</p>
      ) : null}

      {incident.guardianNotified ? null : (
        <div>
          <Notify church={church} id={incident.id} />
        </div>
      )}
    </Card>
  );
}
