"use server";

import { withTenant, claimStation } from "@hearth/db";
import { requireSession } from "@/lib/session";

export interface ClaimResult {
  /** Null when the station has been retired, or belongs to another church. */
  name: string | null;
}

/**
 * A device saying which station it is.
 *
 * The device remembers the choice; the church keeps the configuration. A
 * station that has been retired answers null, so a tablet in a cupboard for six
 * months is asked to choose again rather than checking children in against a
 * configuration nobody maintains.
 */
export async function claim(stationId: string, church?: string): Promise<ClaimResult> {
  const session = await requireSession(church);
  const station = await withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId },
    (tx) => claimStation(tx, stationId),
  );
  return { name: station?.name ?? null };
}
