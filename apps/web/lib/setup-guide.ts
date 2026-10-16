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
  /**
   * R22.3. The rest of the walk, where the step is more than one press.
   *
   * Finishing a step is rarely one control: a plan is started from a template
   * chosen in a box that opens over the screen, and a church that was pointed
   * at the first press and then left alone is a church holding an empty plan.
   * So a step may name the controls in the order they appear, and the guide
   * shows the deepest one that is on the screen right now. Nothing is stored
   * and nothing advances: the screen says where somebody has got to, so going
   * back puts the card back on the press before.
   *
   * Each stop reads `setup.at.<step>` for the first and `setup.at.<step>.2`,
   * `.3` and so on for the rest.
   */
  stops?: readonly GuideStop[];
}

/**
 * R22.3. One stop on a step's walk.
 *
 * A plain name is a control that takes somebody onward: a button that opens a
 * panel, a card that opens a box. The guide moves past it as soon as whatever
 * it opened is on the screen.
 *
 * `field: true` is a box somebody types in. Every field in a form is on the
 * screen from the moment it opens, so the deepest one is not where anybody
 * is: the first empty one is. The guide works down them and lands on the
 * press at the end once they are all answered.
 */
export type GuideStop = string | { target: string; field: true };

export const stopTarget = (one: GuideStop): string =>
  typeof one === "string" ? one : one.target;

export const stopIsField = (one: GuideStop): boolean =>
  typeof one !== "string" && one.field;

export const GUIDE_STEPS: readonly GuideStep[] = [
  {
    step: "members",
    phase: "basics",
    href: "/members/import",
    target: "import-file",
    stops: ["import-file", "import-next", "import-commit"],
  },
  {
    step: "roles",
    phase: "basics",
    href: "/settings/roles",
    target: "take-up-role",
    stops: ["take-up-role", "role-save"],
  },
  {
    step: "team",
    phase: "basics",
    href: "/settings/manage-accesses",
    target: "invite-person",
    stops: ["invite-person", "invite-send"],
  },
  {
    step: "church",
    phase: "basics",
    href: "/settings/church",
    target: "church-details",
    stops: ["church-details", "church-save"],
  },
  {
    step: "portal",
    phase: "basics",
    href: "/settings/website",
    target: "portal-address",
    stops: ["portal-address", "portal-save"],
  },
  {
    step: "profile",
    phase: "basics",
    href: "/settings/profile",
    target: "your-details",
    stops: ["your-details", "profile-save"],
  },
  {
    step: "services",
    phase: "before",
    href: "/services",
    target: "add-service",
    stops: ["add-service", "service-save"],
  },
  {
    step: "rooms",
    phase: "before",
    href: "/settings/rooms",
    target: "add-room",
    stops: ["add-room", "room-save"],
  },
  {
    step: "stations",
    phase: "before",
    href: "/settings/stations",
    target: "add-station",
    stops: ["add-station", "station-save"],
  },
  {
    step: "teams",
    phase: "running",
    href: "/settings/teams",
    target: "add-team",
    stops: ["add-team", "team-save"],
  },
  {
    step: "planTemplate",
    phase: "running",
    href: "/settings/service-template",
    target: "add-template",
    stops: ["add-template", "template-save"],
  },
  {
    step: "plan",
    phase: "running",
    href: "/services",
    target: "plan-service",
    stops: ["plan-service", "plan-from-template", "plan-pick-template", "plan-use-template"],
  },
  {
    step: "groupTypes",
    phase: "running",
    href: "/settings/group-types",
    target: "add-group-type",
    stops: ["add-group-type", "group-type-save"],
  },
  {
    step: "website",
    phase: "ready",
    href: "/website",
    target: "use-design",
    /*
     * No stops, because the builder teaches itself.
     *
     * Every other step points at a screen with one job and names the control
     * to press on it. A builder is twelve jobs on one screen, so it carries a
     * walk of its own, eleven cards from the gallery to Publish. Two cards
     * over one screen, each ringing a different control and each claiming to
     * be the instruction, is the worst of both: the guide's own card said
     * "choose a design" while the walk said what the whole thing was for.
     *
     * So Show me brings a church here and hands over. The walk lives in
     * app/(app)/website/builder/tour.tsx.
     */
    stops: [],
  },
  {
    step: "email",
    phase: "ready",
    href: "/settings/email",
    target: "connect-email",
    /*
     * Two ways out of one screen. A stop whose control is not drawn is
     * skipped, so the mail server's boxes mean nothing to a church going
     * through Resend and the other way round.
     */
    stops: [
      "connect-email",
      "resend-signedin",
      { target: "email-from", field: true },
      { target: "smtp-host", field: true },
      { target: "smtp-port", field: true },
      { target: "smtp-username", field: true },
      { target: "smtp-password", field: true },
      "email-connect",
      "resend-go",
      "resend-authorise",
    ],
  },
  { step: "giving", phase: "ready", href: "/settings/online", target: "connect-stripe" },
  {
    step: "funds",
    phase: "ready",
    href: "/settings/funds",
    target: "add-fund",
    stops: ["add-fund", "fund-save"],
  },
  {
    step: "followups",
    phase: "ready",
    href: "/settings/followups",
    target: "set-owner",
    /*
     * The new stage panel only. The Save on the panel that edits an existing
     * stage is in the document whether that panel is open or not, so naming
     * it here sent the walk to the end the moment the screen drew.
     */
    stops: ["set-owner", "pipeline-pick", "pipeline-owner", "pipeline-add"],
  },
] as const;

export const GUIDE_BY_STEP = new Map(GUIDE_STEPS.map((one) => [one.step, one]));

/**
 * R22.1. A step whose own words beat "Show me".
 *
 * "Show me" is right where the guide is about to point at a control somebody
 * has not met. It is wrong where the step is one errand with a name of its
 * own, and the catalogue key is listed here so a missing one is a build error
 * rather than a blank button.
 */
export const GUIDE_SHOW: Partial<Record<SetupStep, string>> = {
  profile: "setup.showMe.profile",
};

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
export function stepOnScreen(
  pathname: string,
  /**
   * Whether a step is still open, where the caller knows.
   *
   * Two steps can share a screen: Services is where a church writes down that
   * it meets on a Sunday, and it is also where this week's plan is started
   * from. Without this the first of the two wins, so a church that had added
   * its service months ago arrived on Services with the guide pointing at a
   * step it had already finished and nothing to press.
   */
  open?: (step: SetupStep) => boolean,
): GuideStep | null {
  let longest = -1;
  const here: GuideStep[] = [];
  for (const one of GUIDE_STEPS) {
    if (pathname !== one.href && !pathname.startsWith(`${one.href}/`)) continue;
    if (one.href.length > longest) {
      longest = one.href.length;
      here.length = 0;
    }
    if (one.href.length === longest) here.push(one);
  }

  return here.find((one) => open?.(one.step)) ?? here[0] ?? null;
}
