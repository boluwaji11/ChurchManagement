/**
 * R2.10. What a background check says about somebody today.
 *
 * Pure, with nothing behind it, because the same answer is needed on a person's
 * record, on the serving schedule that refuses to roster somebody without one
 * (R10.9, 0.4), and eventually on a station with no network. One implementation
 * of "is this check still good" rather than three that drift.
 */

/** What a church records. "expired" is worked out rather than written down. */
export const CHECK_RESULTS = ["pending", "clear", "flagged"] as const;
export type CheckResult = (typeof CHECK_RESULTS)[number];

/**
 * What the church can act on.
 *
 * `none` and `expired` are deliberately different. Nobody has checked this
 * person, and this person was checked and it has run out, are two different
 * conversations, and a safeguarding lead needs to be able to tell them apart.
 */
export const CHECK_STANDINGS = ["none", "pending", "clear", "expiring", "expired", "flagged"] as const;
export type CheckStanding = (typeof CHECK_STANDINGS)[number];

export interface CheckShape {
  status: string;
  completedOn: string | null;
  expiresOn: string | null;
}

/** How many days before it runs out a church wants to be told. */
export const EXPIRY_WARNING_DAYS = 60;

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/**
 * The latest check decides, with one exception: a flagged check stands until it
 * is superseded by a later one, and never quietly expires into "none".
 */
export function standing(checks: CheckShape[], today: string): CheckStanding {
  if (checks.length === 0) return "none";

  const [latest] = [...checks].sort((a, b) =>
    (b.completedOn ?? "").localeCompare(a.completedOn ?? ""),
  );
  if (!latest) return "none";

  if (latest.status === "flagged") return "flagged";
  if (latest.status === "pending") return "pending";
  if (latest.expiresOn === null) return "clear";
  if (latest.expiresOn < today) return "expired";
  return daysBetween(today, latest.expiresOn) <= EXPIRY_WARNING_DAYS ? "expiring" : "clear";
}

/**
 * R10.9. Whether somebody may be scheduled with children.
 *
 * Clear and expiring both pass: a church that stops a volunteer eight weeks
 * before their check runs out has lost the volunteer and gained nothing. The
 * warning is what the eight weeks are for.
 */
export function mayServeWithChildren(checks: CheckShape[], today: string): boolean {
  const where = standing(checks, today);
  return where === "clear" || where === "expiring";
}

/** When it runs out, for the row that says so. */
export function expiresOn(checks: CheckShape[]): string | null {
  const [latest] = [...checks].sort((a, b) =>
    (b.completedOn ?? "").localeCompare(a.completedOn ?? ""),
  );
  return latest?.expiresOn ?? null;
}
