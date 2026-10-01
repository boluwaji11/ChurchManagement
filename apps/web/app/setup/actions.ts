"use server";

import { withTenant, skipSetupStep, dismissSetup, type SetupStep } from "@hearth/db";
import { explain } from "@/lib/explain";
import { requireSession } from "@/lib/session";

export interface SetupResult {
  error?: string;
}

async function context(church?: string) {
  const session = await requireSession(church);
  return { tenantId: session.tenantId, role: session.role, userId: session.userId };
}

/** R22.1. "We do not run kids' classes." */
export async function skip(step: SetupStep, on: boolean, church?: string): Promise<SetupResult> {
  const ctx = await context(church);
  try {
    await withTenant(ctx, (tx) => skipSetupStep(tx, ctx, step, on));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}

/** R22.1. Putting it away. Settings brings it back. */
export async function putAway(church?: string): Promise<SetupResult> {
  const ctx = await context(church);
  try {
    await withTenant(ctx, (tx) => dismissSetup(tx, ctx, true));
    return {};
  } catch (error) {
    return { error: explain(error) };
  }
}
