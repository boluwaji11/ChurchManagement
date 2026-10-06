"use server";

import { withTenant, churchStanding } from "@connectapp/db";
import { requireSession } from "@/lib/session";

/**
 * R1.1. Whether this church is still waiting on a person.
 *
 * One boolean, read through the session like everything else, so it cannot be
 * asked about a church the caller does not belong to.
 */
export async function stillWaiting(church?: string): Promise<boolean> {
  const session = await requireSession(church);
  const standing = await withTenant(
    { tenantId: session.tenantId, role: session.role },
    (tx) => churchStanding(tx, session.tenantId),
  );
  return !standing.approved;
}
