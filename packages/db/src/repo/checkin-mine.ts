import { and, eq, isNull, inArray } from "drizzle-orm";
import type { Tx } from "../client";
import { checkinVisits } from "../schema/checkin";
import { serviceOccurrences } from "../schema/gatherings";
import { members, householdMemberships } from "../schema/members";
import { InvalidInputError } from "../errors";
import type { WriteActor } from "./members";
import { personForUser } from "./scope";
import { listRooms } from "./rooms";
import { ageInMonths, suggestRoom } from "./age";
import { checkInFamily, type Visit } from "./checkin";

/** What a church calls somebody, which is their preferred name where they gave one. */
const displayName = (r: { firstName: string; preferredName: string | null; lastName: string }) =>
  `${r.preferredName ?? r.firstName} ${r.lastName}`;

/**
 * R17.8, R8.1. A parent checking their own children in before they arrive.
 *
 * The one control is whose children these are. The parent is whoever is signed
 * in, the children come from a query over that person's own household, and
 * nothing in the request says who the parent is, so a request naming somebody
 * else's child finds nothing to check in.
 *
 * The visit and the code are written by the same path the station writes them
 * with, so what prints on arrival is the pair the station would have printed
 * anyway, and a church reading its attendance cannot tell the two apart.
 */

/** A child a member may check in, and where they would go. */
export interface MyChild {
  memberId: string;
  name: string;
  /** R8.14. The room their age suggests, where the church has one that fits. */
  roomId: string | null;
  roomName: string | null;
  roomHue: string | null;
  /** R8.10. What the room has to know. */
  allergy: string | null;
  /** The code already issued, where they are checked in for this service. */
  code: string | null;
}

/**
 * R8.9. Only a head of the household checks its children in.
 *
 * A child's own account would otherwise be able to check their siblings in, and
 * the household's children are exactly the people a pickup code protects.
 */
const DECIDES = ["head", "spouse", "other"];

/** The children in this member's household, and the room each would go to. */
export async function myChildren(
  db: Tx,
  actor: WriteActor,
  occurrenceId: string | null,
): Promise<MyChild[]> {
  if (!actor.userId) return [];
  const self = await personForUser(db, actor.userId);
  if (!self) return [];

  const [mine] = await db
    .select({ householdId: householdMemberships.householdId, role: householdMemberships.role })
    .from(householdMemberships)
    .where(and(eq(householdMemberships.memberId, self), isNull(householdMemberships.endedOn)))
    .limit(1);
  if (!mine?.householdId || !DECIDES.includes(mine.role)) return [];

  const kids = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      preferredName: members.preferredName,
      dateOfBirth: members.dateOfBirth,
      allergies: members.allergies,
    })
    .from(householdMemberships)
    .innerJoin(members, eq(members.id, householdMemberships.memberId))
    .where(and(
      eq(householdMemberships.householdId, mine.householdId),
      eq(householdMemberships.role, "child"),
      isNull(householdMemberships.endedOn),
      isNull(members.archivedAt),
    ));
  if (kids.length === 0) return [];

  const rooms = await listRooms(db);
  const today = new Date().toISOString().slice(0, 10);

  // What is already on them for this service, so pressing twice says the code
  // rather than taking a second one.
  const already = occurrenceId
    ? await db
        .select({ memberId: checkinVisits.memberId, code: checkinVisits.code })
        .from(checkinVisits)
        .where(and(
          eq(checkinVisits.occurrenceId, occurrenceId),
          inArray(checkinVisits.memberId, kids.map((one) => one.id)),
        ))
    : [];

  return kids.map((kid) => {
    const room = suggestRoom(
      rooms,
      kid.dateOfBirth ? ageInMonths(kid.dateOfBirth, today) : null,
    );
    return {
      memberId: kid.id,
      name: displayName(kid),
      roomId: room?.id ?? null,
      roomName: room?.name ?? null,
      roomHue: room?.hue ?? null,
      allergy: kid.allergies,
      code: already.find((one) => one.memberId === kid.id)?.code ?? null,
    };
  });
}

/**
 * R17.8. Checking them in, from the phone, before anybody arrives.
 *
 * The ids are checked against the household rather than trusted, so this is
 * safe to call with whatever the request carried. A service that has been
 * cancelled is refused by the path underneath.
 */
export async function checkInMyChildren(
  db: Tx,
  actor: WriteActor,
  input: { occurrenceId: string; memberIds: string[] },
): Promise<Visit[]> {
  const mine = await myChildren(db, actor, input.occurrenceId);
  const allowed = new Set(mine.map((one) => one.memberId));
  const entries = input.memberIds
    .filter((id) => allowed.has(id))
    .map((id) => ({
      memberId: id,
      roomId: mine.find((one) => one.memberId === id)?.roomId ?? null,
      child: true,
    }));

  if (entries.length === 0) throw new InvalidInputError("checkin.error.notYours");

  const [occurrence] = await db
    .select({ id: serviceOccurrences.id })
    .from(serviceOccurrences)
    .where(eq(serviceOccurrences.id, input.occurrenceId))
    .limit(1);
  if (!occurrence) throw new InvalidInputError("checkin.error.service");

  /*
   * R8.6. The visit goes through the station's own path, which is what makes
   * the code and the attendance row identical either way. That path asks for
   * checkin.run, which a parent does not have and should not be given, so the
   * role is raised for this one call after the household has answered the only
   * question that matters: are these their children.
   */
  return checkInFamily(
    db,
    { ...actor, role: "checkin_volunteer" },
    { occurrenceId: input.occurrenceId, userId: actor.userId ?? null, entries },
  );
}
