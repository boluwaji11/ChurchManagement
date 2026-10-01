import { eq, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { tenants } from "../schema/tenancy";
import { PermissionError, type TenantRole } from "../roles";
import { canManageChurch } from "./church";

/**
 * R22.1, R22.3. Setting a church up.
 *
 * Every step is answered by looking at the church's own records rather than by
 * a checkbox somebody ticked. A wizard that keeps its own idea of progress is a
 * wizard that congratulates a church on importing nobody, and tells somebody
 * who did the work last Tuesday to do it again.
 *
 * So this is resumable because there is nothing to resume: it reads the state
 * of the church each time. Skipping is the only thing worth storing, because
 * "we do not run kids' classes" is a fact about the church that no query can
 * find out.
 */

export const SETUP_STEPS = ["church", "services", "people", "team", "rooms"] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

export interface SetupState {
  step: SetupStep;
  done: boolean;
  skipped: boolean;
}

export interface SetupProgress {
  steps: SetupState[];
  /** How many of the five are answered, one way or the other. */
  settled: number;
  complete: boolean;
  dismissed: boolean;
}

export async function setupProgress(db: Tx, tenantId: string): Promise<SetupProgress> {
  const [church] = await db
    .select({
      addressLine1: tenants.addressLine1,
      dismissedAt: tenants.setupDismissedAt,
      skipped: tenants.setupSkipped,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const [counts] = await db
    .select({
      services: sql<string>`(select count(*) from service_times)`,
      people: sql<string>`(select count(*) from people where archived_at is null)`,
      team: sql<string>`(
        select count(*) from tenant_members where tenant_id = ${tenantId}
      ) + (
        select count(*) from invitations
         where tenant_id = ${tenantId} and accepted_at is null and revoked_at is null
      )`,
      rooms: sql<string>`(select count(*) from rooms)`,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const skipped = new Set(church?.skipped ?? []);
  const done: Record<SetupStep, boolean> = {
    church: Boolean(church?.addressLine1),
    services: Number(counts?.services ?? 0) > 0,
    people: Number(counts?.people ?? 0) > 0,
    // One account is the person who made the church. Two is a church.
    team: Number(counts?.team ?? 0) > 1,
    rooms: Number(counts?.rooms ?? 0) > 0,
  };

  const steps = SETUP_STEPS.map((step) => ({
    step,
    done: done[step],
    skipped: skipped.has(step),
  }));

  return {
    steps,
    settled: steps.filter((step) => step.done || step.skipped).length,
    complete: steps.every((step) => step.done || step.skipped),
    dismissed: church?.dismissedAt !== null && church?.dismissedAt !== undefined,
  };
}

/** R22.1. Skippable: a church that runs no kids' classes says so and moves on. */
export async function skipSetupStep(
  db: Tx,
  actor: { tenantId: string; role: TenantRole },
  step: SetupStep,
  skip = true,
): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "editChurch");

  const [church] = await db
    .select({ skipped: tenants.setupSkipped })
    .from(tenants)
    .where(eq(tenants.id, actor.tenantId))
    .limit(1);

  const current = new Set(church?.skipped ?? []);
  if (skip) current.add(step);
  else current.delete(step);

  await db
    .update(tenants)
    .set({ setupSkipped: [...current], updatedAt: new Date() })
    .where(eq(tenants.id, actor.tenantId));
}

/** R22.1. Putting it away. It comes back from Settings whenever they want it. */
export async function dismissSetup(
  db: Tx,
  actor: { tenantId: string; role: TenantRole },
  dismissed = true,
): Promise<void> {
  if (!canManageChurch(actor.role)) throw new PermissionError(actor.role, "editChurch");
  await db
    .update(tenants)
    .set({ setupDismissedAt: dismissed ? new Date() : null, updatedAt: new Date() })
    .where(eq(tenants.id, actor.tenantId));
}
