"use server";

import {
  withTenant, claimStation, lookupHouseholds, listRooms, suggestRoom,
  checkInFamily, visitsFor, undoCheckIn, roomCounts,
  checkOut, pickupList,
  type CheckinEntry, type OverrideKind, type PickupPerson,
} from "@hearth/db";
import { t } from "@hearth/i18n";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";
import { churchNow } from "@/lib/church-now";
import { getChurch } from "@hearth/db";

async function context(church?: string) {
  const session = await requireSession(church);
  return {
    session,
    actor: { tenantId: session.tenantId, role: session.role },
    ctx: { tenantId: session.tenantId, role: session.role, userId: session.userId },
  };
}

export interface ClaimResult {
  /** Null when the station has been retired, or belongs to another church. */
  name: string | null;
}

/**
 * R8.2. A device saying which station it is.
 *
 * The device remembers the choice; the church keeps the configuration. A
 * station that has been retired answers null, so a tablet in a cupboard for six
 * months is asked to choose again rather than checking children in against a
 * configuration nobody maintains.
 */
export async function claim(stationId: string, church?: string): Promise<ClaimResult> {
  const { ctx } = await context(church);
  const station = await withTenant(ctx, (tx) => claimStation(tx, stationId));
  return { name: station?.name ?? null };
}

export interface FoundPerson {
  id: string;
  name: string;
  lastName: string;
  isChild: boolean;
  ageMonths: number | null;
  /** The room their date of birth points at. A suggestion, always overridable. */
  suggestedRoomId: string | null;
  /** Set when they are already checked in to the service being worked on. */
  checkedIn: boolean;
  /** The visit to check them out of, when they are in. */
  visitId: string | null;
  roomId: string | null;
  /** R8.10. Null means nothing is recorded, which is not the same as clear. */
  allergies: string | null;
  medicalNote: string | null;
}

export interface FoundHousehold {
  id: string;
  name: string;
  people: FoundPerson[];
}

export interface FindResult {
  households?: FoundHousehold[];
  error?: string;
}

/**
 * R8.3. Finding a family from what a parent says at the desk.
 *
 * The room each child is sent to is worked out here rather than in the browser,
 * because the ages and the room configuration are both the church's and a
 * station that is about to lose its network should not be holding the rules in
 * its head.
 */
export async function find(
  query: string,
  occurrenceId: string,
  church?: string,
): Promise<FindResult> {
  const { session, ctx } = await context(church);

  try {
    return await withTenant(ctx, async (tx) => {
      const profile = await getChurch(tx, session.tenantId);
      const asOf = churchNow(profile?.timezone ?? "America/Chicago").date;

      const [matches, rooms] = await Promise.all([
        lookupHouseholds(tx, query, { asOf }),
        listRooms(tx),
      ]);

      const already = occurrenceId ? await visitsFor(tx, occurrenceId) : [];

      return {
        households: matches.map((match) => ({
          id: match.householdId ?? match.people[0]!.id,
          name: match.name,
          people: match.people.map((person) => {
            const visit = already.find((v) => v.personId === person.id);
            return {
              id: person.id,
              name: person.name,
              lastName: person.lastName,
              isChild: person.isChild,
              ageMonths: person.ageMonths,
              suggestedRoomId: person.isChild
                ? (suggestRoom(rooms, person.ageMonths)?.id ?? null)
                : null,
              checkedIn: Boolean(visit) && visit?.checkedOutAt === null,
              visitId: visit?.id ?? null,
              roomId: visit?.roomId ?? null,
              allergies: person.allergies,
              medicalNote: person.medicalNote,
            };
          }),
        })),
      };
    });
  } catch (error) {
    return { error: explain(error) };
  }
}

export interface CheckinResult {
  error?: string;
  /** Who is in each room now, so the desk can warn before the next family. */
  counts?: Record<string, number>;
  /** The code each child was given, so the desk can show what was printed. */
  codes?: Record<string, string>;
}

export async function checkIn(
  occurrenceId: string,
  stationId: string | null,
  entries: CheckinEntry[],
  church?: string,
): Promise<CheckinResult> {
  const { session, actor, ctx } = await context(church);
  try {
    return await withTenant(ctx, async (tx) => {
      const visits = await checkInFamily(tx, actor, {
        occurrenceId,
        stationId,
        userId: session.userId,
        entries,
      });

      const codes: Record<string, string> = {};
      for (const visit of visits) if (visit.code) codes[visit.personId] = visit.code;

      return { counts: await roomCounts(tx, occurrenceId), codes };
    });
  } catch (error) {
    return { error: explain(error) };
  }
}

export async function undo(
  occurrenceId: string,
  personId: string,
  church?: string,
): Promise<CheckinResult> {
  const { actor, ctx } = await context(church);
  try {
    return await withTenant(ctx, async (tx) => {
      await undoCheckIn(tx, actor, occurrenceId, personId);
      return { counts: await roomCounts(tx, occurrenceId) };
    });
  } catch (error) {
    return { error: explain(error) };
  }
}

export interface PickupResult {
  people?: PickupPerson[];
  error?: string;
}

/** R8.8. Who the church has recorded as allowed to collect this child. */
export async function pickup(childId: string, church?: string): Promise<PickupResult> {
  const { ctx } = await context(church);
  try {
    return { people: await withTenant(ctx, (tx) => pickupList(tx, childId)) };
  } catch (error) {
    return { error: explain(error) };
  }
}

export interface ReleaseResult {
  released?: boolean;
  /** What stopped it, as something to show and decide about. */
  block?: { kind: OverrideKind; message: string };
  error?: string;
}

const BLOCKED: Record<string, string> = {
  code: "checkout.block.code",
  pickup: "checkout.block.pickup",
  restriction: "checkout.block.restriction",
};

/**
 * R8.7 to R8.9. Releasing a child, or saying why not.
 *
 * A block comes back as something to read and decide about rather than an
 * error, because deciding is what a supervisor is for and the decision is
 * recorded either way.
 */
export async function release(
  visitId: string,
  code: string,
  collectedBy: string | null,
  override: { kind: OverrideKind; reason: string } | null,
  church?: string,
): Promise<ReleaseResult> {
  const { session, actor, ctx } = await context(church);
  try {
    const result = await withTenant(ctx, (tx) =>
      checkOut(tx, actor, {
        visitId,
        code,
        collectedBy,
        override,
        userId: session.userId,
      }),
    );

    if (result.released) return { released: true };
    return {
      released: false,
      block: {
        kind: result.block!.kind,
        message: t(BLOCKED[result.block!.kind] as never),
      },
    };
  } catch (error) {
    return { error: explain(error) };
  }
}
