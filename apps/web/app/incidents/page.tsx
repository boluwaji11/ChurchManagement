import Link from "next/link";
import { ArrowLeft, Plus, Clock, CheckCircle2 } from "lucide-react";
import {
  withTenant, listIncidents, listRooms, listPeople, listOccurrences, stillHere, getChurch,
  canReadIncidents, canCheckIn, type Incident,
} from "@connectapp/db";
import { Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Empty } from "@/components/empty";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { Notify } from "./notify";
import { FileReport } from "./file-report";
import { Denied } from "@/components/denied";
import { tabMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

/** R17.1. What the browser tab says. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ church?: string }>;
}) {
  const { church } = await searchParams;
  return tabMetadata(t("incident.title"), church);
}

const day = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

/**
 * R8.13. What has been written down, for the members who handle it.
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

  if (!canReadIncidents(session)) {
    return (
      <AppShell session={session} title={t("incident.title")}>
        <Denied />
      </AppShell>
    );
  }

  const { incidents, rooms, members, services, today } = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    async (tx) => {
      const profile = await getChurch(tx, session.tenantId);
      const clock = churchNow(profile?.timezone ?? "America/Chicago");
      const services = await listOccurrences(tx, { from: clock.date, to: clock.date });

      /*
       * R8.13. A report is written about a child who is in a class, so the
       * picker is the children checked in today. With nothing checked in it
       * falls back to the directory, because a report written on the Tuesday
       * about the weekend still has to be fileable.
       */
      const present = (
        await Promise.all(services.map((one) => stillHere(tx, one.id)))
      ).flat();

      const seen = new Set<string>();
      const checkedIn = present
        .filter((p) => (seen.has(p.memberId) ? false : seen.add(p.memberId)))
        .map((p) => ({ id: p.memberId, name: p.name }));

      return {
        incidents: await listIncidents(tx, { role: session.role }),
        rooms: await listRooms(tx),
        members:
          checkedIn.length > 0
            ? checkedIn
            : (await listPeople(tx, { sort: "name" })).map((p) => ({
                id: p.id,
                name: p.displayName,
              })),
        services,
        today: clock.date,
      };
    },
  );

  const filing = canCheckIn(session) ? (
    <FileReport
      church={session.tenantSlug}
      today={today}
      members={members}
      rooms={rooms.map((r) => ({ id: r.id, name: r.name }))}
      services={services.map((s) => ({ id: s.id, name: s.name }))}
      trigger={
        <Button>
          <Plus /> {t("incident.add")}
        </Button>
      }
    />
  ) : undefined;

  return (
    <AppShell session={session} title={t("incident.title")} action={filing} max="max-w-[760px]">
      <Link
        href={`/checkin?church=${session.tenantSlug}`}
        className="inline-flex items-center gap-1.5 self-start font-medium text-primary"
      >
        <ArrowLeft className="size-4" /> {t("checkin.title")}
      </Link>

      <h2 className="font-display text-[22px] leading-[28px] text-fg">{t("incident.reports")}</h2>

      {incidents.length === 0 ? (
        <Empty icon="incident" title={t("incident.none.title")}
          body={t("incident.none.body")} action={filing} />
      ) : (
        incidents.map((incident) => (
          <Report key={incident.id} church={session.tenantSlug} incident={incident} />
        ))
      )}
    </AppShell>
  );
}

/** One report: who, when, where, what happened, and whether the parent knows. */
function Report({ church, incident }: { church: string; incident: Incident }) {
  const hue = incident.roomHue ?? "sky";
  const told = incident.guardianNotified;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-[22px] leading-7 text-fg">{incident.personName}</h3>
        <span className="text-[12px] text-fg-subtle">{day(incident.occurredOn)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {incident.roomName ? (
          <span
            className="rounded-full px-2 py-0.5 text-[12px] font-medium"
            style={{ background: `var(--hue-${hue}-tint)`, color: `var(--hue-${hue}-key)` }}
          >
            {incident.roomName}
          </span>
        ) : null}
        {incident.serviceName ? (
          <span className="rounded-full bg-sunken px-2 py-0.5 text-[12px] font-medium text-fg-muted">
            {incident.serviceName}
          </span>
        ) : null}
        <span
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium"
          style={{
            background: `var(--hue-${told ? "fern" : "amber"}-tint)`,
            color: `var(--hue-${told ? "fern" : "amber"}-key)`,
          }}
        >
          {told ? (
            <CheckCircle2 className="size-3.5" aria-hidden />
          ) : (
            <Clock className="size-3.5" aria-hidden />
          )}
          {told
            ? t("incident.toldOn", {
                on: incident.notifiedAt
                  ? day(incident.notifiedAt.toISOString().slice(0, 10))
                  : "",
              })
            : t("incident.notTold")}
        </span>
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <p className="whitespace-pre-wrap text-pretty text-fg">{incident.description}</p>
        <p className="whitespace-pre-wrap text-pretty text-fg-muted">{incident.action}</p>
        <span className="text-[12px] text-fg-subtle">
          {[
            incident.reportedByName
              ? t("incident.reportedBy", { name: incident.reportedByName })
              : null,
            incident.volunteers
              ? t("incident.witnessedBy", { names: incident.volunteers })
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>

      {told ? null : <Notify church={church} id={incident.id} />}
    </section>
  );
}
