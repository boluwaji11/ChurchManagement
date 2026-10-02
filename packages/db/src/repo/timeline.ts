/**
 * R2.15. One person's record, in the order it happened.
 *
 * Everything the church knows about somebody is spread across eight tables, and
 * the question nobody can answer from any of them is the obvious one: what has
 * happened with this person. A pastor opening a record before a visit wants the
 * last year on one screen, not six cards to piece together.
 *
 * Built by asking each source for its own rows and merging them by day, rather
 * than by a union in SQL. Each source has its own permission gate, and a union
 * would have to carry all of them in one WHERE clause where a mistake is quiet.
 * Here a gate is a line of TypeScript next to the query it guards.
 *
 * Giving (0.3), serving (0.4) and communications (1.0) are not built yet. Each
 * one is another block in this file when it lands, and the shape is ready for
 * them: a kind, a day, a name from the church's records, and a gate.
 */
import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { Tx } from "../client";
import { attendanceRecords, serviceOccurrences } from "../schema/gatherings";
import { checkinVisits, checkinRooms } from "../schema/checkin";
import { groupMemberships, groups, groupTypes } from "../schema/groups";
import { milestones } from "../schema/people";
import { people } from "../schema/people";
import { pipelineEntries, pipelines, followUps } from "../schema/followups";
import { backgroundChecks } from "../schema/people";
import { type TenantRole } from "../roles";
import { listNotesForPerson } from "./notes";
import { canSeeChecks } from "./checks";

/**
 * What kind of thing happened. The screen turns each one into a sentence, so
 * the words live in the catalogue rather than in here.
 */
export type TimelineKind =
  | "added"
  | "attended"
  | "checkedIn"
  | "joinedGroup"
  | "leftGroup"
  | "milestone"
  | "note"
  | "enteredPipeline"
  | "leftPipeline"
  | "followUpDone"
  | "check"
  | "archived";

export interface TimelineEntry {
  /** Stable across reads, so the screen can key on it. */
  id: string;
  kind: TimelineKind;
  /** The day it happened, ISO. Everything is placed by day. */
  on: string;
  /** A name out of the church's own records: a service, a group, a pipeline. */
  subject?: string | null;
  /** Something the church wrote, or a value to name in the catalogue. */
  detail?: string | null;
  /** A milestone kind or a check result, which the screen names. */
  code?: string | null;
  /** R24.4. The colour the thing already carries elsewhere in the product. */
  hue?: string | null;
}

const day = (value: Date | string | null): string | null => {
  if (!value) return null;
  return typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
};

/** How much of a life is read at once. A church of this size has years of it. */
export const TIMELINE_LIMIT = 120;

/**
 * R2.15. The whole record, newest first.
 *
 * `viewer` decides what is in it. A note nobody may read is absent rather than
 * redacted: a row saying "something is here you cannot see" tells somebody in
 * the office that a confidential note exists, which is most of what it says.
 */
export async function personTimeline(
  db: Tx,
  viewer: { tenantId: string; role: TenantRole; userId?: string },
  personId: string,
  opts: { limit?: number } = {},
): Promise<TimelineEntry[]> {
  const limit = opts.limit ?? TIMELINE_LIMIT;
  const out: TimelineEntry[] = [];

  const [person] = await db
    .select({
      createdAt: people.createdAt,
      archivedAt: people.archivedAt,
      firstVisitOn: people.firstVisitOn,
      membershipDate: people.membershipDate,
    })
    .from(people)
    .where(eq(people.id, personId))
    .limit(1);
  if (!person) return [];

  // The day the church first wrote them down.
  const added = day(person.createdAt);
  if (added) out.push({ id: `added:${personId}`, kind: "added", on: added });
  if (person.archivedAt) {
    out.push({ id: `archived:${personId}`, kind: "archived", on: day(person.archivedAt)! });
  }

  // R7.x. Services they were marked present at.
  const attended = await db
    .select({
      id: attendanceRecords.id,
      on: serviceOccurrences.occursOn,
      name: serviceOccurrences.name,
    })
    .from(attendanceRecords)
    .innerJoin(serviceOccurrences, eq(serviceOccurrences.id, attendanceRecords.occurrenceId))
    .where(eq(attendanceRecords.personId, personId))
    .orderBy(desc(serviceOccurrences.occursOn))
    .limit(limit);
  for (const row of attended) {
    out.push({ id: `attended:${row.id}`, kind: "attended", on: row.on, subject: row.name });
  }

  // R8.x. A child in a class, which is a different fact from being counted
  // present and is the one a parent asks about.
  const visits = await db
    .select({
      id: checkinVisits.id,
      at: checkinVisits.checkedInAt,
      room: checkinRooms.name,
      hue: checkinRooms.hue,
    })
    .from(checkinVisits)
    .leftJoin(checkinRooms, eq(checkinRooms.id, checkinVisits.roomId))
    .where(eq(checkinVisits.personId, personId))
    .orderBy(desc(checkinVisits.checkedInAt))
    .limit(limit);
  for (const row of visits) {
    out.push({
      id: `checkin:${row.id}`,
      kind: "checkedIn",
      on: day(row.at)!,
      subject: row.room,
      hue: row.hue,
    });
  }

  // R9.4. Joining a group, and leaving one. Two entries from one row, because
  // they happened on different days and both belong in the order.
  const memberships = await db
    .select({
      id: groupMemberships.id,
      joinedOn: groupMemberships.joinedOn,
      leftOn: groupMemberships.leftOn,
      name: groups.name,
      hue: groupTypes.hue,
    })
    .from(groupMemberships)
    .innerJoin(groups, eq(groups.id, groupMemberships.groupId))
    .leftJoin(groupTypes, eq(groupTypes.id, groups.typeId))
    .where(eq(groupMemberships.personId, personId))
    .limit(limit);
  for (const row of memberships) {
    if (row.joinedOn) {
      out.push({
        id: `joined:${row.id}`, kind: "joinedGroup", on: row.joinedOn,
        subject: row.name, hue: row.hue,
      });
    }
    if (row.leftOn) {
      out.push({
        id: `left:${row.id}`, kind: "leftGroup", on: row.leftOn,
        subject: row.name, hue: row.hue,
      });
    }
  }

  // R2.6. Baptism, membership, a wedding. The spine of a person's story here.
  const marks = await db
    .select({
      id: milestones.id,
      on: milestones.occurredOn,
      kind: milestones.kind,
      note: milestones.notes,
    })
    .from(milestones)
    .where(eq(milestones.personId, personId))
    .orderBy(desc(milestones.occurredOn))
    .limit(limit);
  for (const row of marks) {
    out.push({
      id: `milestone:${row.id}`, kind: "milestone", on: row.on,
      code: row.kind, detail: row.note,
    });
  }

  // R2.7, R6.2. Notes come through the notes repo rather than off the table,
  // because a confidential one is encrypted at rest and every read of one
  // writes an audit entry naming the reader. Reading them here without that
  // would be a way to read confidential notes unaudited.
  //
  // A note somebody may not read is absent rather than redacted: a redaction
  // still tells the office that a confidential note about this person exists,
  // which is most of what the note says.
  const written = await listNotesForPerson(db, personId, viewer.role, {
    tenantId: viewer.tenantId,
    ...(viewer.userId ? { userId: viewer.userId } : {}),
  });
  for (const note of written) {
    if (note.restricted) continue;
    out.push({
      id: `note:${note.id}`,
      kind: "note",
      on: day(note.createdAt)!,
      detail: note.body ?? null,
      code: note.classification,
    });
  }

  // R5.3. Entering a pipeline, and coming out of the other end of it.
  const entries = await db
    .select({
      id: pipelineEntries.id,
      startedOn: pipelineEntries.startedOn,
      closedAt: pipelineEntries.closedAt,
      name: pipelines.name,
      hue: pipelines.hue,
    })
    .from(pipelineEntries)
    .innerJoin(pipelines, eq(pipelines.id, pipelineEntries.pipelineId))
    .where(eq(pipelineEntries.personId, personId))
    .limit(limit);
  for (const row of entries) {
    out.push({
      id: `pipeline:${row.id}`, kind: "enteredPipeline", on: row.startedOn,
      subject: row.name, hue: row.hue,
    });
    if (row.closedAt) {
      out.push({
        id: `pipelineOut:${row.id}`, kind: "leftPipeline", on: day(row.closedAt)!,
        subject: row.name, hue: row.hue,
      });
    }
  }

  // R5.5. A follow-up somebody answered. The outcome is the thing worth having
  // six months later, so it is the detail rather than the title.
  const done = await db
    .select({
      id: followUps.id,
      at: followUps.doneAt,
      title: followUps.title,
      outcome: followUps.outcome,
    })
    .from(followUps)
    .where(and(eq(followUps.personId, personId), isNotNull(followUps.doneAt)))
    .orderBy(desc(followUps.doneAt))
    .limit(limit);
  for (const row of done) {
    out.push({
      id: `followUp:${row.id}`, kind: "followUpDone", on: day(row.at)!,
      subject: row.title, detail: row.outcome,
    });
  }

  // R2.10, R21.11. Background checks, for the roles that hold them.
  if (canSeeChecks(viewer.role)) {
    const checks = await db
      .select({
        id: backgroundChecks.id,
        on: backgroundChecks.completedOn,
        provider: backgroundChecks.provider,
        status: backgroundChecks.status,
      })
      .from(backgroundChecks)
      .where(and(eq(backgroundChecks.personId, personId), isNotNull(backgroundChecks.completedOn)))
      .orderBy(desc(backgroundChecks.completedOn))
      .limit(limit);
    for (const row of checks) {
      out.push({
        id: `check:${row.id}`, kind: "check", on: row.on!,
        subject: row.provider, code: row.status,
      });
    }
  }

  // Newest first. Where two things share a day, the order is by kind so the
  // list does not reshuffle between reads.
  out.sort((a, b) => (a.on === b.on ? a.id.localeCompare(b.id) : b.on.localeCompare(a.on)));
  return out.slice(0, limit);
}
