import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { incidentReports, checkinRooms } from "../schema/checkin";
import { people } from "../schema/people";
import { serviceOccurrences } from "../schema/gatherings";
import { PermissionError, type TenantRole } from "../roles";
import { InvalidInputError } from "../errors";
import type { WriteActor } from "./people";
import { canCheckIn } from "./checkin";

/**
 * R8.13. Incident reports.
 *
 * Something happened to a child: a bump on the head, a bite, a child who could
 * not be settled, a near miss at a door. Writing it down at the time is what
 * turns a vague memory three weeks later into a record, and it is the one
 * thing a church is asked for when a parent, an insurer or a safeguarding
 * officer comes back to it.
 *
 * Two rules hold this file together.
 *
 * **It is written by whoever saw it.** The volunteer in the room files it from
 * the station. A report that only a pastor can write is a report that gets
 * written on Tuesday, from memory, by somebody who was not there.
 *
 * **It is read by almost nobody.** A child's incident is sensitive about the
 * child and about every volunteer named in it, so reading is the safeguarding
 * roles and the Owner. The volunteer who filed it cannot read it back.
 */

/** R8.13. Who may read what has been filed. */
export const CAN_READ_INCIDENTS: readonly TenantRole[] = ["owner", "admin", "pastoral"];
export const canReadIncidents = (role: TenantRole): boolean =>
  CAN_READ_INCIDENTS.includes(role);

/** Whoever was standing there. Filing is wider than reading on purpose. */
export const canFileIncident = (role: TenantRole): boolean =>
  canCheckIn(role) || canReadIncidents(role);

export interface IncidentInput {
  personId: string;
  roomId?: string | null;
  occurrenceId?: string | null;
  /** The day it happened, which is not always the day it is written. */
  occurredOn: string;
  /** Who was in the room. */
  volunteers?: string | null;
  description: string;
  action: string;
  /** Set where the guardian was told before the report was filed. */
  guardianNotified?: boolean;
  userId?: string | null;
}

export interface Incident {
  id: string;
  personId: string;
  personName: string;
  roomId: string | null;
  roomName: string | null;
  occurrenceId: string | null;
  serviceName: string | null;
  occurredOn: string;
  volunteers: string;
  description: string;
  action: string;
  guardianNotified: boolean;
  notifiedAt: Date | null;
  reportedBy: string | null;
  createdAt: Date;
}

const clean = (raw: string | null | undefined): string => (raw ?? "").trim();

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Files a report. There is no edit afterwards.
 *
 * A record that can be tidied up later is worth nothing on the day somebody
 * asks what happened, so this writes once and the only thing that moves after
 * it is whether the guardian has been told.
 */
export async function fileIncident(
  db: Tx,
  actor: WriteActor,
  input: IncidentInput,
): Promise<Incident> {
  if (!canFileIncident(actor.role)) throw new PermissionError(actor.role, "fileIncident");

  const description = clean(input.description);
  const action = clean(input.action);
  if (!description) throw new InvalidInputError("incident.error.description");
  if (!action) throw new InvalidInputError("incident.error.action");
  if (!ISO_DATE.test(input.occurredOn)) throw new InvalidInputError("incident.error.date");

  const [person] = await db
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.id, input.personId), isNull(people.archivedAt)))
    .limit(1);
  if (!person) throw new InvalidInputError("incident.error.person");

  const notified = input.guardianNotified === true;

  const [row] = await db
    .insert(incidentReports)
    .values({
      tenantId: actor.tenantId,
      personId: input.personId,
      roomId: input.roomId ?? null,
      occurrenceId: input.occurrenceId ?? null,
      occurredOn: input.occurredOn,
      volunteers: clean(input.volunteers),
      description,
      action,
      guardianNotified: notified,
      notifiedAt: notified ? new Date() : null,
      notifiedBy: notified ? (input.userId ?? null) : null,
      reportedBy: input.userId ?? null,
    })
    .returning({ id: incidentReports.id });

  // Read back through the same path a reader uses, so the writer never sees a
  // shape the reader does not.
  const [filed] = await incidentsWhere(db, eq(incidentReports.id, row!.id));
  return filed!;
}

/**
 * R8.13. Recording that the guardian has been told.
 *
 * It usually happens after the report is written: the volunteer files it while
 * the child is still in the room and the parent is told at the door twenty
 * minutes later. Set once, with the moment kept, and it does not go back.
 */
export async function markGuardianNotified(
  db: Tx,
  actor: WriteActor,
  id: string,
  userId?: string | null,
): Promise<Incident> {
  if (!canReadIncidents(actor.role)) throw new PermissionError(actor.role, "readIncidents");

  const updated = await db
    .update(incidentReports)
    .set({ guardianNotified: true, notifiedAt: new Date(), notifiedBy: userId ?? null })
    .where(and(eq(incidentReports.id, id), eq(incidentReports.guardianNotified, false)))
    .returning({ id: incidentReports.id });

  if (updated.length === 0) {
    const [already] = await incidentsWhere(db, eq(incidentReports.id, id));
    if (!already) throw new InvalidInputError("incident.error.missing");
    return already;
  }

  const [row] = await incidentsWhere(db, eq(incidentReports.id, id));
  return row!;
}

async function incidentsWhere(db: Tx, where: ReturnType<typeof eq>): Promise<Incident[]> {
  const rows = await db
    .select({
      id: incidentReports.id,
      personId: incidentReports.personId,
      roomId: incidentReports.roomId,
      occurrenceId: incidentReports.occurrenceId,
      occurredOn: sql<string>`${incidentReports.occurredOn}::text`,
      volunteers: incidentReports.volunteers,
      description: incidentReports.description,
      action: incidentReports.action,
      guardianNotified: incidentReports.guardianNotified,
      notifiedAt: incidentReports.notifiedAt,
      reportedBy: incidentReports.reportedBy,
      createdAt: incidentReports.createdAt,
      firstName: people.firstName,
      lastName: people.lastName,
      preferredName: people.preferredName,
      roomName: checkinRooms.name,
      serviceName: serviceOccurrences.name,
    })
    .from(incidentReports)
    .innerJoin(people, eq(people.id, incidentReports.personId))
    .leftJoin(checkinRooms, eq(checkinRooms.id, incidentReports.roomId))
    .leftJoin(serviceOccurrences, eq(serviceOccurrences.id, incidentReports.occurrenceId))
    .where(where)
    .orderBy(desc(incidentReports.occurredOn), desc(incidentReports.createdAt));

  return rows.map((r) => ({
    id: r.id,
    personId: r.personId,
    personName: `${r.preferredName?.trim() || r.firstName} ${r.lastName}`,
    roomId: r.roomId,
    roomName: r.roomName,
    occurrenceId: r.occurrenceId,
    serviceName: r.serviceName,
    occurredOn: r.occurredOn,
    volunteers: r.volunteers,
    description: r.description,
    action: r.action,
    guardianNotified: r.guardianNotified,
    notifiedAt: r.notifiedAt,
    reportedBy: r.reportedBy,
    createdAt: r.createdAt,
  }));
}

/** R8.13. Everything filed, newest first. Restricted. */
export async function listIncidents(
  db: Tx,
  actor: { role: TenantRole },
  opts: { personId?: string } = {},
): Promise<Incident[]> {
  if (!canReadIncidents(actor.role)) throw new PermissionError(actor.role, "readIncidents");
  return incidentsWhere(
    db,
    opts.personId
      ? eq(incidentReports.personId, opts.personId)
      : sql`true` as unknown as ReturnType<typeof eq>,
  );
}

/** How many reports are waiting on somebody telling the guardian. */
export async function unnotifiedCount(
  db: Tx,
  actor: { role: TenantRole },
): Promise<number> {
  if (!canReadIncidents(actor.role)) throw new PermissionError(actor.role, "readIncidents");
  const [row] = await db
    .select({ n: sql<string>`count(*)` })
    .from(incidentReports)
    .where(eq(incidentReports.guardianNotified, false));
  return Number(row?.n ?? 0);
}
