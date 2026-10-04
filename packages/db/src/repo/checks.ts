import { desc, eq, inArray, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { backgroundChecks, people } from "../schema/people";
import { PermissionError, type TenantRole } from "../roles";
import { can, rolesWith } from "../permissions";
import { InvalidInputError } from "../errors";
import {
  CHECK_RESULTS, standing, expiresOn, mayServeWithChildren,
  type CheckResult, type CheckStanding,
} from "./check-rules";

/**
 * R2.10, R21.11. Background checks: who checked, when, what it said, when it
 * runs out.
 *
 * Status tracking only. Hearth never holds the report or what the provider
 * found, because a platform given away free is the last place a criminal record
 * should live. The church's provider holds that, and this holds the answer.
 *
 * Append only. A new check supersedes an old one rather than overwriting it:
 * "we checked her in 2024" has to stay answerable in 2030, which is what R21.11
 * means by permanently retained. There is no edit and no delete.
 */

/** The same roles that read an incident. This is the same drawer. */
export const CAN_SEE_CHECKS: readonly TenantRole[] = rolesWith("checkin.checks");
export const canSeeChecks = (role: TenantRole): boolean => can(role, "checkin.checks");

export interface BackgroundCheck {
  id: string;
  personId: string;
  provider: string | null;
  status: string;
  completedOn: string | null;
  expiresOn: string | null;
  createdAt: Date;
}

export interface CheckStandingView {
  standing: CheckStanding;
  expiresOn: string | null;
  checks: BackgroundCheck[];
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const trim = (value: string | null | undefined): string | null => value?.trim() || null;

const rows = (db: Tx) =>
  db
    .select({
      id: backgroundChecks.id,
      personId: backgroundChecks.personId,
      provider: backgroundChecks.provider,
      status: backgroundChecks.status,
      completedOn: sql<string | null>`${backgroundChecks.completedOn}::text`,
      expiresOn: sql<string | null>`${backgroundChecks.expiresOn}::text`,
      createdAt: backgroundChecks.createdAt,
    })
    .from(backgroundChecks);

/** R2.10. Every check on somebody, most recent first. Nothing is ever removed. */
export async function checksFor(
  db: Tx,
  actor: { role: TenantRole },
  personId: string,
): Promise<CheckStandingView> {
  if (!canSeeChecks(actor.role)) throw new PermissionError(actor.role, "seeChecks");

  const found = await rows(db)
    .where(eq(backgroundChecks.personId, personId))
    .orderBy(desc(backgroundChecks.completedOn), desc(backgroundChecks.createdAt));

  const today = new Date().toISOString().slice(0, 10);
  return { standing: standing(found, today), expiresOn: expiresOn(found), checks: found };
}

/** R2.10. Recording one. */
export async function recordCheck(
  db: Tx,
  actor: { tenantId: string; role: TenantRole; userId?: string | null },
  input: {
    personId: string;
    provider: string;
    status: CheckResult;
    completedOn?: string | null;
    expiresOn?: string | null;
  },
): Promise<BackgroundCheck> {
  if (!canSeeChecks(actor.role)) throw new PermissionError(actor.role, "seeChecks");

  const provider = trim(input.provider);
  if (!provider) throw new InvalidInputError("check.error.provider");
  if (!CHECK_RESULTS.includes(input.status)) throw new InvalidInputError("check.error.status");

  for (const day of [input.completedOn, input.expiresOn]) {
    if (day && !ISO.test(day)) throw new InvalidInputError("check.error.date");
  }

  // Pending is the one that has not happened yet. Everything else happened on a
  // day, and a church that cannot say which day has not recorded a check.
  if (input.status !== "pending" && !input.completedOn) {
    throw new InvalidInputError("check.error.completed");
  }
  if (input.completedOn && input.expiresOn && input.expiresOn <= input.completedOn) {
    throw new InvalidInputError("check.error.expiry");
  }

  const [person] = await db
    .select({ id: people.id })
    .from(people)
    .where(eq(people.id, input.personId))
    .limit(1);
  if (!person) throw new InvalidInputError("error.notFound.person");

  const [row] = await db
    .insert(backgroundChecks)
    .values({
      tenantId: actor.tenantId,
      personId: input.personId,
      provider,
      status: input.status,
      completedOn: input.completedOn ?? null,
      expiresOn: input.expiresOn ?? null,
    })
    .returning({ id: backgroundChecks.id });

  const [after] = await rows(db).where(eq(backgroundChecks.id, row!.id));
  return after!;
}

export interface CheckRow {
  personId: string;
  name: string;
  standing: CheckStanding;
  expiresOn: string | null;
}

/**
 * R2.10, R18.7. Where every checked person stands, for the one screen a
 * safeguarding lead opens: what has run out, and what is about to.
 */
export async function checkStandings(
  db: Tx,
  actor: { role: TenantRole },
  opts: { today?: string } = {},
): Promise<CheckRow[]> {
  if (!canSeeChecks(actor.role)) throw new PermissionError(actor.role, "seeChecks");
  const today = opts.today ?? new Date().toISOString().slice(0, 10);

  const found = await rows(db).orderBy(desc(backgroundChecks.completedOn));
  const byPerson = new Map<string, BackgroundCheck[]>();
  for (const row of found) {
    byPerson.set(row.personId, [...(byPerson.get(row.personId) ?? []), row]);
  }
  if (byPerson.size === 0) return [];

  const named = await db
    .select({
      id: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
      preferredName: people.preferredName,
    })
    .from(people)
    .where(inArray(people.id, [...byPerson.keys()]));

  return named
    .map((person) => {
      const theirs = byPerson.get(person.id) ?? [];
      return {
        personId: person.id,
        name: `${person.preferredName?.trim() || person.firstName} ${person.lastName}`,
        standing: standing(theirs, today),
        expiresOn: expiresOn(theirs),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** R10.9. The question the serving schedule will ask, in one place. */
export async function clearedForChildren(
  db: Tx,
  personId: string,
  today: string,
): Promise<boolean> {
  const found = await rows(db).where(eq(backgroundChecks.personId, personId));
  return mayServeWithChildren(found, today);
}
