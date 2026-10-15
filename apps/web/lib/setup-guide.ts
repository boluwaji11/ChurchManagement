import type { SetupPhase, SetupStep } from "@connectapp/db";

/**
 * R22.1, R22.3. What each step of setting up points at, and what to press
 * when you get there.
 *
 * The guide sends somebody to the screen that really does the job rather than
 * wrapping that screen in a wizard: a church that adds a room here and another
 * one next March should be in the same place both times, and learning where
 * things are is most of what the first hour is for.
 *
 * The cost of that is arriving on a screen with no idea which of its controls
 * was meant, so each step names one. The control carries `data-guide` with
 * that name and the guide rings it and points an arrow at it, which is the
 * difference between "it is on this screen" and knowing what to press.
 *
 * Type-only import, so none of `@connectapp/db` reaches the browser bundle.
 */
export interface GuideStep {
  step: SetupStep;
  phase: SetupPhase;
  /** The screen that does the job. */
  href: string;
  /**
   * The control on it, by its `data-guide` name. The guide rings it and points
   * at it on arrival. Left out where the whole screen is the step.
   */
  target?: string;
}

export const GUIDE_STEPS: readonly GuideStep[] = [
  { step: "members", phase: "hour", href: "/members/import", target: "import-file" },
  { step: "services", phase: "hour", href: "/services", target: "add-service" },
  { step: "team", phase: "hour", href: "/settings/manage-accesses", target: "invite-person" },
  { step: "church", phase: "hour", href: "/settings/church", target: "church-details" },
  { step: "rooms", phase: "before", href: "/settings/rooms", target: "add-room" },
  { step: "stations", phase: "before", href: "/settings/stations", target: "add-station" },
  { step: "portal", phase: "before", href: "/settings/website", target: "portal-address" },
  { step: "profile", phase: "before", href: "/settings/profile", target: "your-details" },
  { step: "teams", phase: "running", href: "/settings/teams", target: "add-team" },
  {
    step: "planTemplate",
    phase: "running",
    href: "/settings/service-template",
    target: "add-template",
  },
  { step: "plan", phase: "running", href: "/services", target: "plan-service" },
  { step: "groupTypes", phase: "running", href: "/settings/group-types", target: "add-group-type" },
  { step: "email", phase: "ready", href: "/settings/email", target: "connect-email" },
  { step: "giving", phase: "ready", href: "/settings/online", target: "connect-stripe" },
  { step: "funds", phase: "ready", href: "/settings/funds", target: "add-fund" },
  { step: "followups", phase: "ready", href: "/settings/followups", target: "set-owner" },
] as const;

export const GUIDE_BY_STEP = new Map(GUIDE_STEPS.map((one) => [one.step, one]));

/**
 * The phases, in the order the steps name them.
 *
 * Read off the table rather than written beside it: a fourth phase was added
 * to the steps and to the model, and the column went on drawing three,
 * because the order was a list of its own that nobody thought to change.
 */
export const GUIDE_PHASES: readonly SetupPhase[] = [
  ...new Set(GUIDE_STEPS.map((one) => one.phase)),
];

/**
 * The step whose screen this is, so the guide can lift it and point at the
 * control.
 *
 * Longest match wins, the same rule the navigation and the help articles use,
 * because `/members/import` and `/members` are both prefixes of the address a
 * church is looking at and only one of them is the step.
 */
export function stepOnScreen(pathname: string): GuideStep | null {
  let best: GuideStep | null = null;
  for (const one of GUIDE_STEPS) {
    if (pathname !== one.href && !pathname.startsWith(`${one.href}/`)) continue;
    if (!best || one.href.length > best.href.length) best = one;
  }
  return best;
}
