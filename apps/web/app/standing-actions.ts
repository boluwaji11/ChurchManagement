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

/**
 * R1.4, R1.6. What this account may do, as one short string.
 *
 * A role changed on the access screen reaches somebody else's open page only
 * when that page next goes to the server. Comparing this against what the page
 * was built with is how it finds out, and it carries no information the holder
 * does not already have about themselves.
 */
export async function accessNow(church?: string): Promise<string> {
  const session = await requireSession(church);
  return [session.role, ...[...(session.permissions ?? [])].sort()].join("|");
}
