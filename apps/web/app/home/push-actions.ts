"use server";

import {
  withTenant, savePushSubscription, removePushSubscription, hasPushSubscription,
  pushPublicKey, type PushRegistration,
} from "@connectapp/db";
import { requireSession } from "@/lib/session";
import { explain } from "@/lib/explain";

export interface PushResult {
  error?: string;
}

/** R17.11. The key a browser needs before it can subscribe. */
export async function publicKey(): Promise<string | null> {
  return pushPublicKey();
}

/** R17.11. This browser saying where to reach it. */
export async function subscribe(
  input: PushRegistration,
  church?: string,
): Promise<PushResult> {
  try {
    const session = await requireSession(church);
    await withTenant(
      {
        tenantId: session.tenantId,
        role: session.role,
        userId: session.userId,
        permissions: session.permissions,
      },
      (tx) =>
        savePushSubscription(
          tx,
          { tenantId: session.tenantId, userId: session.userId },
          input,
        ),
    );
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R17.11. And turning it off again. */
export async function unsubscribe(endpoint: string, church?: string): Promise<PushResult> {
  try {
    const session = await requireSession(church);
    await withTenant(
      {
        tenantId: session.tenantId,
        role: session.role,
        userId: session.userId,
        permissions: session.permissions,
      },
      (tx) => removePushSubscription(tx, endpoint),
    );
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/**
 * R17.11. Whether the church knows about the subscription this browser holds.
 *
 * A browser keeps its own subscription across sessions, so it can hold one the
 * church has no row for: the row was never written because a save failed, or it
 * was dropped when a send came back 404. The control read the browser alone and
 * said notifications were on while nothing could reach this machine.
 */
export async function known(endpoint: string, church?: string): Promise<boolean> {
  try {
    const session = await requireSession(church);
    return await withTenant(
      {
        tenantId: session.tenantId,
        role: session.role,
        userId: session.userId,
        permissions: session.permissions,
      },
      (tx) => hasPushSubscription(tx, endpoint),
    );
  } catch {
    return false;
  }
}
