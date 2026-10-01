import { and, eq, isNull, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { checkinCodes, checkinOfflineEvents, checkinVisits } from "../schema/checkin";
import { PermissionError } from "../roles";
import { InvalidInputError } from "../errors";
import type { WriteActor } from "./people";
import { newCode, CODE_ATTEMPTS } from "./codes";
import { canCheckIn, checkInFamily, undoCheckIn } from "./checkin";
import { checkOut, type OverrideKind } from "./checkout";

/**
 * R8.20 to R8.23. A station that lost the network, and what happens after.
 *
 * The design case is 09:58 on a Sunday with the wifi down, so the station has
 * to be carrying everything it needs before that happens: the people, the
 * rooms, the medical notes, the pickup lists, and a block of security codes
 * nobody else can issue.
 *
 * Codes are the part that cannot be improvised. A code has to be unique for the
 * whole church, and a tablet on its own cannot know what another tablet just
 * printed. So the uniqueness is settled here, while the network is up, by
 * writing the codes down before anybody needs them.
 */

/** How many children one station can check in with no network. */
export const BLOCK_SIZE = 150;

/** Top the block up once it falls below this, while there is still a network. */
export const BLOCK_LOW = 40;

export interface CodeBlock {
  /** Codes the station may print, in order. */
  codes: string[];
  /** How many of this station's reserved codes are already on a label. */
  used: number;
}

/**
 * The codes this station holds for this service, topped up to a full block.
 *
 * Called whenever the station has a network: on claiming, on opening a service,
 * and after every reconciliation. Asking twice is cheap and returns the same
 * block, so a station that reloads does not strand the codes it was holding.
 */
export async function reserveCodes(
  db: Tx,
  actor: WriteActor,
  input: { occurrenceId: string; stationId: string; size?: number },
): Promise<CodeBlock> {
  if (!canCheckIn(actor.role)) throw new PermissionError(actor.role, "checkIn");

  const size = input.size ?? BLOCK_SIZE;
  const mine = and(
    eq(checkinCodes.occurrenceId, input.occurrenceId),
    eq(checkinCodes.stationId, input.stationId),
  );

  const held = await db
    .select({ code: checkinCodes.code, usedAt: checkinCodes.usedAt })
    .from(checkinCodes)
    .where(mine);

  const free = held.filter((row) => row.usedAt === null).map((row) => row.code);
  const used = held.length - free.length;

  for (let attempt = 0; free.length < size && attempt < size * CODE_ATTEMPTS; attempt += 1) {
    const candidate = newCode();
    // The unique index is what settles a race between two stations asking at
    // the same moment. A code that loses is simply not taken, and the loop asks
    // for another, because nothing has been printed yet.
    const written = await db
      .insert(checkinCodes)
      .values({
        tenantId: actor.tenantId,
        occurrenceId: input.occurrenceId,
        stationId: input.stationId,
        code: candidate,
      })
      .onConflictDoNothing({ target: [checkinCodes.tenantId, checkinCodes.code] })
      .returning({ code: checkinCodes.code });

    if (written[0]) free.push(written[0].code);
  }

  if (free.length === 0) throw new InvalidInputError("checkin.error.code");
  return { codes: free, used };
}

/** Whether a code is spoken for, so the online path never issues it twice. */
export async function codeReserved(db: Tx, code: string): Promise<boolean> {
  const [row] = await db
    .select({ id: checkinCodes.id })
    .from(checkinCodes)
    .where(eq(checkinCodes.code, code))
    .limit(1);
  return Boolean(row);
}

/**
 * What a station did while it was offline.
 *
 * The id is the station's own, made before the event happened, because that is
 * the only way a log sent twice can be recognised as the same log.
 */
export interface OfflineCheckin {
  id: string;
  kind: "checkin";
  at: string;
  occurrenceId: string;
  personId: string;
  roomId: string | null;
  child: boolean;
  /** From the station's reserved block. Null for an adult taking a badge. */
  code: string | null;
}

export interface OfflineCheckout {
  id: string;
  kind: "checkout";
  at: string;
  occurrenceId: string;
  personId: string;
  /** What was read off the guardian's label. */
  code: string;
  collectedBy: string | null;
  override: { kind: OverrideKind; reason: string } | null;
}

export type OfflineEvent = OfflineCheckin | OfflineCheckout;

/** Why an event could not be applied, for somebody to read and decide about. */
export type ConflictKind =
  /** The person was already checked in, somewhere this station did not know about. */
  | "elsewhere"
  /** The code on the label is not one this station was given. */
  | "code"
  /** There is no visit to check out of. */
  | "missing"
  /** Somebody else had already collected them. */
  | "collected";

export interface Conflict {
  eventId: string;
  kind: ConflictKind;
  personId: string;
  occurrenceId: string;
  /** When the station did it, which is what a volunteer will remember. */
  at: string;
}

export interface Reconciliation {
  applied: number;
  /** Events already sent on an earlier attempt, counted rather than reapplied. */
  duplicates: number;
  conflicts: Conflict[];
}

/**
 * R8.23. Replaying a station's log, one event at a time, oldest first.
 *
 * Nothing auto-merges a child's location. A child this station checked into the
 * nursery who is already marked into the toddler room is a question about where
 * a child physically is, and a wrong automatic answer to that is worse than an
 * alert. The event is refused and reported, and the record stays as it was.
 */
export async function reconcile(
  db: Tx,
  actor: WriteActor,
  input: { stationId: string; userId?: string | null; events: OfflineEvent[] },
): Promise<Reconciliation> {
  if (!canCheckIn(actor.role)) throw new PermissionError(actor.role, "checkIn");

  const out: Reconciliation = { applied: 0, duplicates: 0, conflicts: [] };
  const ordered = [...input.events].sort((a, b) => a.at.localeCompare(b.at));

  for (const event of ordered) {
    const seen = await db
      .select({ id: checkinOfflineEvents.id })
      .from(checkinOfflineEvents)
      .where(eq(checkinOfflineEvents.eventId, event.id))
      .limit(1);
    if (seen[0]) {
      out.duplicates += 1;
      continue;
    }

    const conflict =
      event.kind === "checkin"
        ? await replayCheckin(db, actor, input, event)
        : await replayCheckout(db, actor, input, event);

    await db.insert(checkinOfflineEvents).values({
      tenantId: actor.tenantId,
      stationId: input.stationId,
      eventId: event.id,
      kind: event.kind,
      happenedAt: new Date(event.at),
      outcome: conflict ?? "applied",
    });

    if (conflict) {
      out.conflicts.push({
        eventId: event.id,
        kind: conflict,
        personId: event.personId,
        occurrenceId: event.occurrenceId,
        at: event.at,
      });
    } else {
      out.applied += 1;
    }
  }

  return out;
}

async function replayCheckin(
  db: Tx,
  actor: WriteActor,
  input: { stationId: string; userId?: string | null },
  event: OfflineCheckin,
): Promise<ConflictKind | null> {
  const [existing] = await db
    .select({ id: checkinVisits.id, roomId: checkinVisits.roomId, stationId: checkinVisits.stationId })
    .from(checkinVisits)
    .where(
      and(
        eq(checkinVisits.occurrenceId, event.occurrenceId),
        eq(checkinVisits.personId, event.personId),
      ),
    )
    .limit(1);

  if (existing) {
    // The same station, the same room, is this station's own earlier work
    // arriving twice. Anything else is a child in two places.
    const same = existing.stationId === input.stationId && existing.roomId === event.roomId;
    return same ? null : "elsewhere";
  }

  if (event.child) {
    if (!event.code) return "code";
    const taken = await db
      .update(checkinCodes)
      .set({ usedAt: new Date(event.at) })
      .where(
        and(
          eq(checkinCodes.code, event.code),
          eq(checkinCodes.stationId, input.stationId),
          isNull(checkinCodes.usedAt),
        ),
      )
      .returning({ id: checkinCodes.id });
    if (taken.length === 0) return "code";
  }

  await checkInFamily(db, actor, {
    occurrenceId: event.occurrenceId,
    stationId: input.stationId,
    userId: input.userId ?? null,
    entries: [
      {
        personId: event.personId,
        roomId: event.roomId,
        child: event.child,
        code: event.code,
        at: event.at,
      },
    ],
  });

  return null;
}

async function replayCheckout(
  db: Tx,
  actor: WriteActor,
  input: { stationId: string; userId?: string | null },
  event: OfflineCheckout,
): Promise<ConflictKind | null> {
  const [visit] = await db
    .select({ id: checkinVisits.id, checkedOutAt: checkinVisits.checkedOutAt })
    .from(checkinVisits)
    .where(
      and(
        eq(checkinVisits.occurrenceId, event.occurrenceId),
        eq(checkinVisits.personId, event.personId),
      ),
    )
    .limit(1);

  if (!visit) return "missing";
  if (visit.checkedOutAt) return "collected";

  const result = await checkOut(db, actor, {
    visitId: visit.id,
    code: event.code,
    collectedBy: event.collectedBy,
    override: event.override,
    userId: input.userId ?? null,
    at: event.at,
  });

  return result.released ? null : "code";
}

/**
 * Taking an offline check-in back off a station that has not reconciled yet.
 *
 * A volunteer who checks the wrong child in while the network is down presses
 * undo the same as they would online, so the event never reaches the server.
 * This is here for the case where it already did.
 */
export async function undoReplayed(
  db: Tx,
  actor: WriteActor,
  occurrenceId: string,
  personId: string,
): Promise<void> {
  await undoCheckIn(db, actor, occurrenceId, personId);
}

/** How many offline events a station has sent, for the supervisor view. */
export async function offlineEventCount(db: Tx, stationId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<string>`count(*)` })
    .from(checkinOfflineEvents)
    .where(eq(checkinOfflineEvents.stationId, stationId));
  return Number(row?.n ?? 0);
}
