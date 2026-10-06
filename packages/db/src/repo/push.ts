import { and, eq, inArray } from "drizzle-orm";
import type { Tx } from "../client";
import { pushSubscriptions } from "../schema/push";
import { InvalidInputError } from "../errors";

/**
 * R16.10, R17.11. Pushing a notification to the device somebody is holding.
 *
 * The same lines the bell carries, delivered to a phone that is not open on
 * the app. Nothing new is composed here and nothing is sent to an address a
 * church pays for: a push goes to the browser's own service, free, with no
 * credentials belonging to the church involved. That is why this is here while
 * email and SMS are not.
 *
 * The keys are the church's platform keys rather than per-church ones, because
 * a VAPID pair identifies the application server to the push service and there
 * is one of those.
 */

/** What a browser hands over when somebody says yes. */
export interface PushRegistration {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}

/** R17.11. A browser saying where to reach it. */
export async function savePushSubscription(
  db: Tx,
  actor: { tenantId: string; userId?: string | null },
  input: PushRegistration,
): Promise<void> {
  if (!actor.userId) throw new InvalidInputError("push.error.noUser");
  if (!/^https:\/\//.test(input.endpoint)) throw new InvalidInputError("push.error.endpoint");

  await db
    .insert(pushSubscriptions)
    .values({
      tenantId: actor.tenantId,
      userId: actor.userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent?.slice(0, 300) ?? null,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        tenantId: actor.tenantId,
        userId: actor.userId,
        p256dh: input.p256dh,
        auth: input.auth,
      },
    });
}

/** R17.11. Turning it off, from the browser that turned it on. */
export async function removePushSubscription(db: Tx, endpoint: string): Promise<void> {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

/** Whether this browser is already on the list. */
export async function hasPushSubscription(db: Tx, endpoint: string): Promise<boolean> {
  const [row] = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .limit(1);
  return Boolean(row);
}

/** Every browser these people have said yes on. */
export async function subscriptionsFor(
  db: Tx,
  tenantId: string,
  userIds: string[],
): Promise<{ id: string; endpoint: string; p256dh: string; auth: string }[]> {
  const to = [...new Set(userIds.filter(Boolean))];
  if (to.length === 0) return [];

  return db
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(and(
      eq(pushSubscriptions.tenantId, tenantId),
      inArray(pushSubscriptions.userId, to),
    ));
}

/** R17.11. Clearing out what a browser has dropped. */
export async function dropSubscriptions(db: Tx, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, ids));
}
