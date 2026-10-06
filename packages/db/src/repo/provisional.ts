import { count, eq, isNull } from "drizzle-orm";
import type { Tx } from "../client";
import { tenants } from "../schema/tenancy";
import { members } from "../schema/members";
import { InvalidInputError } from "../errors";

/**
 * R1.1, R21.x. A new church is provisional until a human has looked at it.
 *
 * Anybody can type a church name into a form, and some of them are not a
 * church. The answer is not an approval queue: that was built and taken out on
 * the same day, because it put work on a volunteer every time a regular signed
 * up for a door the church had already chosen to open.
 *
 * The answer is a cap. A provisional church works completely for the person who
 * made it, up to a small number of members, with no join link and no
 * invitations. A real church is unblocked within an hour, which is what the
 * sixty-minute time-to-value number needs. An abuser gets nothing worth having:
 * no way to reach anybody, and no congregation to put in it.
 */

/** How many members a church can hold before a human has looked at it. */
export const PROVISIONAL_PEOPLE = 25;

export interface ChurchStanding {
  approved: boolean;
  /** How many members the church holds, counted only while it matters. */
  members: number;
  limit: number;
  /** How many more it can take. Unbounded once approved. */
  remaining: number | null;
}

/** R1.1. Whether a human has looked at this church yet. */
export async function isApproved(db: Tx, tenantId: string): Promise<boolean> {
  const [row] = await db
    .select({ approvedAt: tenants.approvedAt })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return row?.approvedAt != null;
}

/** R1.1. Where this church stands, for a screen that has to say so. */
export async function churchStanding(db: Tx, tenantId: string): Promise<ChurchStanding> {
  const approved = await isApproved(db, tenantId);
  if (approved) {
    return { approved: true, members: 0, limit: PROVISIONAL_PEOPLE, remaining: null };
  }

  const [row] = await db
    .select({ n: count() })
    .from(members)
    .where(isNull(members.archivedAt));

  const held = row?.n ?? 0;
  return {
    approved: false,
    members: held,
    limit: PROVISIONAL_PEOPLE,
    remaining: Math.max(PROVISIONAL_PEOPLE - held, 0),
  };
}

/**
 * R1.1. Refuses the thing a provisional church cannot do yet.
 *
 * Called by whatever is about to reach outside the church: handing out a join
 * link, inviting somebody. The message says what to do next, which is to ask.
 */
export async function requireApproved(db: Tx, tenantId: string): Promise<void> {
  if (await isApproved(db, tenantId)) return;
  throw new InvalidInputError("provisional.error.locked");
}

/**
 * R1.1. Refuses one more person past the cap.
 *
 * Checked at the moment of writing rather than on the screen before it, because
 * an import adds four hundred at once and a screen is not where that happens.
 */
export async function requireRoomForPeople(
  db: Tx,
  tenantId: string,
  adding = 1,
): Promise<void> {
  const standing = await churchStanding(db, tenantId);
  if (standing.approved) return;
  if (standing.members + adding <= standing.limit) return;
  throw new InvalidInputError("provisional.error.people");
}

/**
 * R1.1. A human has looked at it.
 *
 * Run by whoever operates the platform, from the approval script. There is no
 * screen for it inside a church, because a church cannot approve itself.
 */
export async function approveChurch(
  db: Tx,
  tenantId: string,
  by: string,
): Promise<void> {
  await db
    .update(tenants)
    .set({ approvedAt: new Date(), approvedBy: by.trim().slice(0, 200) || "unnamed" })
    .where(eq(tenants.id, tenantId));
}

/** R1.1. Takes approval away again, for a church that turned out not to be one. */
export async function unapproveChurch(db: Tx, tenantId: string): Promise<void> {
  await db
    .update(tenants)
    .set({ approvedAt: null, approvedBy: null, selfSignup: false })
    .where(eq(tenants.id, tenantId));
}
