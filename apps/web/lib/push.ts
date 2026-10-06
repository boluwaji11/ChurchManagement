import "server-only";
import {
  withTenant, subscriptionsFor, dropSubscriptions, sendPush, pushConfigured,
  type PushPayload,
} from "@connectapp/db";
import type { TenantRole } from "@connectapp/db";

/**
 * R16.10. Sending a push, after the write that caused it.
 *
 * Called from an action rather than from inside the repository, so the HTTP to
 * a browser's push service never happens inside a transaction. A send that
 * takes three seconds would otherwise be a transaction held open for three
 * seconds on every save.
 *
 * It never throws. A push that does not arrive is a push that does not arrive;
 * the bell already has the line and the member reads it next time they open
 * the app. Failing the save because a notification failed would be the tail
 * wagging the dog.
 */
export async function pushTo(
  scope: { tenantId: string; role: TenantRole; userId?: string | null },
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  if (!pushConfigured() || userIds.length === 0) return;

  const inside = { ...scope, userId: scope.userId ?? undefined };

  try {
    const targets = await withTenant(inside, (tx) =>
      subscriptionsFor(tx, scope.tenantId, userIds));
    if (targets.length === 0) return;

    const { gone } = await sendPush(targets, payload);
    if (gone.length > 0) {
      await withTenant(inside, (tx) => dropSubscriptions(tx, gone));
    }
  } catch {
    // Nothing a church does should fail because a push did.
  }
}
