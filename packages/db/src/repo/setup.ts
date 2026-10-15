import { eq, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { tenants } from "../schema/tenancy";
import { PermissionError, canManageGiving, type TenantRole } from "../roles";
import { canManageChurch } from "./church";
import { canManageRooms } from "./rooms";
import { canManageStations } from "./stations";
import { canManageServices } from "./services";

/**
 * R22.1, R22.2, R22.3. Setting a church up.
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

/*
 * R22.1. Three phases, because twelve steps handed over at once read as
 * homework and get closed. A phase opens when the one before it is settled,
 * so four things are in view at a time and each set has a reason to be done
 * by a particular day.
 */
export const SETUP_PHASES = ["hour", "before", "running", "ready"] as const;
export type SetupPhase = (typeof SETUP_PHASES)[number];

/*
 * In the order one unblocks the next, rather than the order the settings
 * happen to sit in. Nothing in the product works without a directory: groups,
 * check-in, serving and every report read off it, and the target is an hour
 * from signing up to a directory somebody can use.
 */
export const SETUP_STEPS = [
  // The first hour. R22.3 measures this one.
  "members",
  "services",
  "team",
  "church",
  // Before the first service day.
  "rooms",
  "stations",
  "portal",
  "profile",
  // Running the service. The one-time work behind a service day, as opposed
  // to the planning a church does every week on top of it.
  "teams",
  "planTemplate",
  "plan",
  "groupTypes",
  // When they are ready. None of this is needed to run a service.
  "email",
  "giving",
  "funds",
  "followups",
] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

export const SETUP_PHASE_OF: Record<SetupStep, SetupPhase> = {
  members: "hour",
  services: "hour",
  team: "hour",
  church: "hour",
  rooms: "before",
  stations: "before",
  portal: "before",
  profile: "before",
  teams: "running",
  planTemplate: "running",
  plan: "running",
  groupTypes: "running",
  email: "ready",
  giving: "ready",
  funds: "ready",
  followups: "ready",
};

/**
 * R1.4, R22.1. Who a step is for.
 *
 * The guide only goes to somebody who runs the church, but running the church
 * is not one permission: an administrator cannot open Funds, so an
 * administrator should never be sent there. A step nobody in the room can do
 * is worse than a step that is missing, because it reads as the product being
 * broken.
 */
const STEP_IS_FOR: Partial<Record<SetupStep, (role: { role: TenantRole }) => boolean>> = {
  rooms: canManageRooms,
  stations: canManageStations,
  teams: canManageServices,
  planTemplate: canManageServices,
  plan: canManageServices,
  giving: canManageGiving,
  funds: canManageGiving,
};

export interface SetupState {
  step: SetupStep;
  phase: SetupPhase;
  done: boolean;
  skipped: boolean;
}

export interface SetupProgress {
  steps: SetupState[];
  /** How many of the twelve are answered, one way or the other. */
  settled: number;
  /** What is actually left, which is the number worth saying out loud. */
  left: number;
  /** The phase being worked on: the first one with anything still open. */
  phase: SetupPhase;
  complete: boolean;
  dismissed: boolean;
}

/**
 * One statement for the lot. Twelve counts over twelve tables, each of them
 * tenant-scoped or keyed, is still cheaper than twelve round trips, and this
 * is read on every screen through the frame's own cached read.
 *
 * `userId` is for the profile step, which is the one thing here that is about
 * the person rather than the church.
 */
export async function setupProgress(
  db: Tx,
  actor: { tenantId: string; role: TenantRole; userId?: string },
): Promise<SetupProgress> {
  const { tenantId, userId } = actor;
  const [church] = await db
    .select({
      addressLine1: tenants.addressLine1,
      portalName: tenants.portalName,
      dismissedAt: tenants.setupDismissedAt,
      skipped: tenants.setupSkipped,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const [counts] = await db
    .select({
      // A dated service on the calendar. The weekly pattern it could have come
      // from has no screen that writes it yet (HRT-368), so this counts what a
      // church can actually produce today.
      services: sql<string>`(select count(*) from service_occurrences)`,
      members: sql<string>`(select count(*) from members where archived_at is null)`,
      team: sql<string>`(
        select count(*) from tenant_members where tenant_id = ${tenantId}
      ) + (
        select count(*) from invitations
         where tenant_id = ${tenantId} and accepted_at is null and revoked_at is null
      )`,
      rooms: sql<string>`(select count(*) from checkin_rooms)`,
      teams: sql<string>`(select count(*) from teams where archived_at is null)`,
      planTemplates: sql<string>`(select count(*) from plan_templates)`,
      // A service with an order written on it, as opposed to one on the
      // calendar with nothing against it yet.
      plan: sql<string>`(select count(*) from plan_items)`,
      groupTypes: sql<string>`(select count(*) from group_types)`,
      stations: sql<string>`(select count(*) from checkin_stations)`,
      /*
       * Every church is written down with General and Offering & Tithe, so
       * two is the state it starts in and three is a church that has named a
       * fund of its own.
       */
      funds: sql<string>`(select count(*) from funds)`,
      /*
       * A pipeline with nobody against it does nothing: the steps fall due and
       * land on no desk. Every church is seeded the six, so the count that
       * means anything is how many have an owner.
       */
      pipelines: sql<string>`(
        select count(*) from pipelines
         where owner_user_id is not null and archived_at is null
      )`,
      email: sql<string>`(
        select count(*) from church_providers
         where tenant_id = ${tenantId} and channel = 'email' and state = 'connected'
      )`,
      giving: sql<string>`(
        select count(*) from stripe_accounts
         where tenant_id = ${tenantId} and details_submitted
      )`,
      // Their own record, filled in past the name the church was created with.
      profile: sql<string>`(
        select count(*) from members m
         where m.app_user_id = ${userId ?? null}::uuid
           and m.archived_at is null
           and (
             m.photo_key is not null
             or exists (
               select 1 from contact_methods c
                where c.member_id = m.id and c.kind = 'phone'
             )
           )
      )`,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const n = (value: string | undefined) => Number(value ?? 0);
  const skipped = new Set(church?.skipped ?? []);
  const done: Record<SetupStep, boolean> = {
    // One record is the founder, written when the church was made. Two is a
    // church that has brought its people in.
    members: n(counts?.members) > 1,
    services: n(counts?.services) > 0,
    // One account is the person who made the church. Two is a church.
    team: n(counts?.team) > 1,
    church: Boolean(church?.addressLine1),
    rooms: n(counts?.rooms) > 0,
    teams: n(counts?.teams) > 0,
    planTemplate: n(counts?.planTemplates) > 0,
    plan: n(counts?.plan) > 0,
    groupTypes: n(counts?.groupTypes) > 0,
    stations: n(counts?.stations) > 0,
    portal: Boolean(church?.portalName),
    profile: n(counts?.profile) > 0,
    email: n(counts?.email) > 0,
    giving: n(counts?.giving) > 0,
    funds: n(counts?.funds) > 2,
    followups: n(counts?.pipelines) > 0,
  };

  const steps = SETUP_STEPS.filter((step) => STEP_IS_FOR[step]?.(actor) ?? true).map(
    (step) => ({
      step,
      phase: SETUP_PHASE_OF[step],
      done: done[step],
      skipped: skipped.has(step),
    }),
  );

  const open = (phase: SetupPhase) =>
    steps.some((step) => step.phase === phase && !step.done && !step.skipped);

  return {
    steps,
    settled: steps.filter((step) => step.done || step.skipped).length,
    left: steps.filter((step) => !step.done && !step.skipped).length,
    // The first phase with anything left in it. All three settled leaves the
    // last one, which is what a finished guide should be showing.
    phase: SETUP_PHASES.find(open) ?? "ready",
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
  if (!canManageChurch(actor)) throw new PermissionError(actor.role, "editChurch");

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
  if (!canManageChurch(actor)) throw new PermissionError(actor.role, "editChurch");
  await db
    .update(tenants)
    .set({ setupDismissedAt: dismissed ? new Date() : null, updatedAt: new Date() })
    .where(eq(tenants.id, actor.tenantId));
}
