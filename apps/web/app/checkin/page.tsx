import Link from "next/link";
import { FileWarning, Tag, Printer, Move, Plus, CalendarDays } from "lucide-react";
import {
  withTenant, listRooms, listOccurrences, listStations, listIncidents, listPeople,
  visitsFor, getChurch,
  roomBoard, roomRoster, arriving, canSupervise, canReadIncidents,
  type RoomRosterEntry,
} from "@hearth/db";
import { serviceNow } from "@hearth/db/rules";
import { Banner, Button } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { Empty } from "@/components/empty";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { ageLine } from "@/lib/room-ages";
import { Floor, type FloorStart } from "./floor";
import { CheckInSheet } from "./check-in-sheet";

export const dynamic = "force-dynamic";

/** "09:00" as a church says it. */
const readableTime = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
};

/**
 * R8.14 to R8.19. Children's ministry during a service.
 *
 * The screen the person walking the corridor reads: who has arrived and is not
 * in a class yet, and every class with its numbers. The desk is somewhere else,
 * because the desk is a queue and belongs to whoever is standing at it.
 */
export default async function CheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ church?: string; service?: string }>;
}) {
  const params = await searchParams;
  const session = await requireSession(params.church);

  const data = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    async (tx) => {
      const profile = await getChurch(tx, session.tenantId);
      const clock = churchNow(profile?.timezone ?? "America/Chicago");
      const today = await listOccurrences(tx, { from: clock.date, to: clock.date });
      const services = today
        .filter((o) => o.status === "scheduled")
        .map((o) => ({
          id: o.id,
          name: o.name,
          startsAt: o.startsAt,
          readableTime: readableTime(o.startsAt),
        }));

      // The one running or about to, and outside those hours the first of the
      // day, because somebody opening this at nine at night is looking back at
      // what happened rather than at nothing.
      const chosen =
        services.find((s) => s.id === params.service)?.id ||
        serviceNow(services, clock.time) ||
        services[0]?.id ||
        "";

      const rooms = await listRooms(tx);
      const board = chosen ? await roomBoard(tx, chosen) : null;
      const rosters: Record<string, RoomRosterEntry[]> = {};
      for (const room of board?.rooms ?? []) {
        rosters[room.roomId] = await roomRoster(tx, chosen!, room.roomId);
      }

      return {
        clock,
        services,
        chosen,
        rooms,
        board,
        rosters,
        waiting: chosen ? await arriving(tx, chosen, clock.date) : [],
        // R8.14. Anybody the church holds who is not already checked in to
        // this gathering, so a child who walked past the desk can still be
        // checked in from here.
        directory: await listPeople(tx, { sort: "name" }),
        here: chosen ? await visitsFor(tx, chosen) : [],
        stations: (await listStations(tx)).length,
        // R8.13. The number on the Incidents button is the reports where the
        // guardian has still to be told, which is the one thing left open on a
        // report that has been written.
        openIncidents: canReadIncidents(session)
          ? (await listIncidents(tx, { role: session.role })).filter(
              (i) => i.notifiedAt === null,
            ).length
          : 0,
      };
    },
  );

  const service = data.services.find((s) => s.id === data.chosen);
  const present = new Set(data.here.map((visit) => visit.personId));

  const action = (
    <CheckInSheet
      church={session.tenantSlug}
      occurrenceId={data.chosen}
      candidates={[
        ...data.waiting.map((child) => ({
          value: `v:${child.visitId}`,
          label: child.name,
          keywords: child.household ?? undefined,
        })),
        ...data.directory
          .filter((person) => !present.has(person.id))
          .map((person) => ({
            value: `p:${person.id}`,
            label: person.displayName,
            keywords: person.householdName ?? undefined,
          })),
      ]}
      rooms={data.rooms.map((room) => ({ id: room.id, name: room.name }))}
      trigger={
        <Button>
          <Plus /> {t("checkin.check")}
        </Button>
      }
    />
  );

  if (!canSupervise(session)) {
    return (
      <AppShell session={session} title={t("checkin.title")}>
        <Banner tone="info" title={t("checkin.title")}>{t("forbidden.askAdmin")}</Banner>
      </AppShell>
    );
  }

  return (
    <AppShell session={session} title={t("checkin.title")} action={action}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[28px] leading-[34px] text-fg">
            {service
              ? t("checkin.serviceAt", { name: service.name, time: service.readableTime })
              : t("checkin.noService.title")}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3.5">
          <span className="flex items-center gap-1.5 text-[12px] text-fg-subtle">
            <Move className="size-3.5" aria-hidden /> {t("board.dragChild")}
          </span>

          {canReadIncidents(session) ? (
            <ToolLink href={`/incidents?church=${session.tenantSlug}`}>
              <FileWarning /> {t("incident.title")}
              {data.openIncidents > 0 ? (
                <span
                  data-numeric
                  className="rounded-full px-1.5 text-[11px] font-semibold"
                  style={{ background: "var(--hue-amber-500)", color: "var(--color-fg)" }}
                >
                  {data.openIncidents}
                </span>
              ) : null}
            </ToolLink>
          ) : null}

          <ToolLink href={`/checkin/labels?church=${session.tenantSlug}`}>
            <Tag /> {t("checkin.labels")}
          </ToolLink>

          <ToolLink
            href={`/checkin/rooms/print?church=${session.tenantSlug}&service=${data.chosen ?? ""}`}
            target="_blank"
          >
            <Printer /> {t("checkin.rosters")}
          </ToolLink>
        </div>
      </div>

      {/* A church with several services today picks which one it is looking at. */}
      {data.services.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {data.services.map((one) => (
            <Link
              key={one.id}
              href={`/checkin?church=${session.tenantSlug}&service=${one.id}`}
              aria-current={one.id === data.chosen ? "page" : undefined}
              className={`flex h-[34px] items-center rounded-full px-3.5 text-[13px] font-medium ${
                one.id === data.chosen
                  ? "border border-fg bg-fg text-canvas"
                  : "border border-line-strong bg-surface text-fg hover:bg-sunken"
              }`}
            >
              {t("checkin.serviceAt", { name: one.name, time: one.readableTime })}
            </Link>
          ))}
        </div>
      ) : null}

      {data.chosen ? (
        <Floor
          church={session.tenantSlug}
          occurrenceId={data.chosen}
          rooms={data.rooms.map((r) => ({ roomId: r.id, ages: ageLine(r) }))}
          start={
            {
              board: data.board,
              rosters: data.rosters,
              waiting: data.waiting,
            } satisfies FloorStart
          }
        />
      ) : (
        <Empty icon={CalendarDays} title={t("checkin.noService.title")} body={t("checkin.noService.body")} />
      )}
    </AppShell>
  );
}

/** The design's 34px secondary buttons along the top of this screen. */
function ToolLink({
  href,
  target,
  children,
}: {
  href: string;
  target?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      target={target}
      className="flex h-[34px] items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 text-[13px] font-medium text-fg hover:bg-sunken [&_svg]:size-4"
    >
      {children}
    </Link>
  );
}
