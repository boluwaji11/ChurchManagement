"use server";

import { withTenant, peopleNotIn } from "@hearth/db";
import { requireSession } from "@/lib/session";

/** R5.4. People a church could put on this board, narrowed by what was typed. */
export async function findPeople(
  pipelineId: string,
  search: string,
  church?: string,
): Promise<{ id: string; name: string }[]> {
  const session = await requireSession(church);
  return withTenant(
    { tenantId: session.tenantId, role: session.role, userId: session.userId, permissions: session.permissions },
    (tx) => peopleNotIn(tx, pipelineId, search),
  );
}
