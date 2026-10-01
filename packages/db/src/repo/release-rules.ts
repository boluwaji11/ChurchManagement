/**
 * R8.7 to R8.9. Whether a child may go, decided with no database behind it.
 *
 * The questions are asked in this order on purpose. A restriction is checked
 * before the code, because a person a court order names should be stopped
 * whether or not they are holding the right label, and the volunteer should
 * have that conversation once.
 *
 * It is pure so that a station with no network reaches the same answer as the
 * server does, rather than a weaker one.
 */

export type OverrideKind = "code" | "pickup" | "restriction";

export interface ReleaseQuestion {
  /**
   * What the visit is. A child is released on a code. An adult wearing a name
   * badge is not somebody being collected, so there is no code to ask for and
   * none is demanded.
   */
  kind: "child" | "adult";
  /** The code on the visit, which is what was printed on the guardian's label. */
  expected: string | null;
  /** What was typed at the door. */
  typed: string;
  /** Who is collecting, where the church holds a record of them. */
  collectedBy: string | null;
  /** R8.9. People a do-not-contact order names against this child. */
  restricted: string[];
  /** R8.8. Who the church has recorded as allowed to collect. */
  allowed: string[];
  /** A decision somebody made instead of an answer. */
  override: { kind: OverrideKind } | null;
}

/** What stops this release, or null when nothing does. */
export function releaseBlock(q: ReleaseQuestion): OverrideKind | null {
  if (q.collectedBy) {
    if (q.restricted.includes(q.collectedBy) && q.override?.kind !== "restriction") {
      return "restriction";
    }
    if (!q.allowed.includes(q.collectedBy) && q.override?.kind !== "pickup") {
      return "pickup";
    }
  }

  if (q.kind === "adult") return null;

  // A child is released on the code, and a child whose visit carries none is
  // refused until somebody decides otherwise. Silence is not a match.
  const matches = q.expected !== null && q.typed === q.expected;
  if (!matches && q.override?.kind !== "code") return "code";

  return null;
}
