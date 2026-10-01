"use server";

import { withTenant, requestToJoin, decideRequest } from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface AskResult {
  error?: string;
}

/** R9.5. Asking to join a group. */
export async function ask(
  groupId: string,
  message: string | null,
  church?: string,
): Promise<AskResult> {
  const session = await requireSession(church);
  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId };
  try {
    await withTenant(actor, (tx) => requestToJoin(tx, actor, { groupId, message }));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R9.6. The leader's answer, which puts them on the roster when it is yes. */
export async function decide(
  requestId: string,
  approve: boolean,
  church?: string,
): Promise<AskResult> {
  const session = await requireSession(church);
  const actor = { tenantId: session.tenantId, role: session.role, userId: session.userId };
  try {
    await withTenant(actor, (tx) => decideRequest(tx, actor, { requestId, approve }));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
