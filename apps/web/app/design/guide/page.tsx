"use client";

import * as React from "react";
import { PageTitle, Section } from "@/components/section";
import { GuideBody, type RailStep } from "@/components/guide/body";
import { Point } from "@/components/guide/point";
import { Button } from "@connectapp/ui";
import type { SetupPhase, SetupStep } from "@connectapp/db";

/**
 * R22.1, R24.11. The setup guide's pieces, in the states they have.
 *
 * The gallery is a tool for us rather than a screen a church sees, so the copy
 * around the pieces is written inline. What it is for is the states, which are
 * the thing that cannot be checked by opening one screen: a path part walked,
 * a step skipped, a step whose screen is open, a church that has finished, and
 * the mark the guide puts on a control.
 */

const STEPS: readonly { step: SetupStep; phase: SetupPhase }[] = [
  { step: "members", phase: "basics" },
  { step: "team", phase: "basics" },
  { step: "church", phase: "basics" },
  { step: "services", phase: "before" },
  { step: "rooms", phase: "before" },
  { step: "stations", phase: "before" },
  { step: "portal", phase: "before" },
  { step: "profile", phase: "before" },
  { step: "teams", phase: "running" },
  { step: "planTemplate", phase: "running" },
  { step: "plan", phase: "running" },
  { step: "groupTypes", phase: "running" },
  { step: "email", phase: "ready" },
  { step: "giving", phase: "ready" },
  { step: "funds", phase: "ready" },
  { step: "followups", phase: "ready" },
];

const make = (done: SetupStep[], skipped: SetupStep[] = []): RailStep[] =>
  STEPS.map((one) => ({
    ...one,
    done: done.includes(one.step),
    skipped: skipped.includes(one.step),
  }));

/** The rail's own chrome, without the server actions behind it. */
function Rail({
  title,
  steps,
  phase,
  here,
}: {
  title: string;
  steps: RailStep[];
  phase: SetupPhase;
  here?: SetupStep | null;
}) {
  const [open, setOpen] = React.useState<SetupPhase>(phase);
  return (
    <div className="w-[332px] shrink-0 rounded-[14px] border border-line bg-surface">
      <div className="flex flex-col gap-4 p-5">
        <span className="text-[15px] font-semibold text-fg">{title}</span>
        <GuideBody
          steps={steps}
          phase={open}
          pinned
          here={here ?? null}
          busy={false}
          onSkip={() => {}}
          onOpenPhase={setOpen}
          onShow={() => {}}
        />
      </div>
    </div>
  );
}

export default function GuideGallery() {
  const [pointing, setPointing] = React.useState(false);

  return (
    <div className="flex flex-col gap-12">
      <PageTitle
        title="Setup guide"
        lede="The guide beside every screen while a church is setting up, and the mark it puts on the control a step names."
      />

      <Section
        title="The path"
        note="A marker each, the thread running between them with a bead at its middle, and the thread coloured as far as the church has got. The step being worked on tells its whole story; the rest are a line each, and pressing one opens it."
      >
        <div className="flex flex-wrap items-start gap-6">
          <Rail title="A church on its first morning" steps={make([])} phase="basics" />
          <Rail
            title="Part walked, one skipped"
            steps={make(["members", "services"], ["team"])}
            phase="basics"
          />
          <Rail
            title="On the screen a step points at"
            steps={make(["members", "services", "team", "church"])}
            phase="before"
            here="rooms"
          />
        </div>
      </Section>

      <Section
        title="Later phases, and a church that has finished"
        note="A phase opens when the one before it is settled, and any of them can be opened by hand: a church that wants to look at giving before it has named a room should not have to argue with us."
      >
        <div className="flex flex-wrap items-start gap-6">
          <Rail
            title="When you are ready"
            steps={make([
              "members", "services", "team", "church",
              "rooms", "stations", "portal", "profile",
              "teams", "planTemplate", "plan", "groupTypes",
            ])}
            phase="ready"
          />
          <Rail
            title="Every step answered"
            steps={make(
              [
                "members", "services", "team", "church", "rooms", "stations", "portal",
                "teams", "planTemplate", "plan", "email", "giving", "funds",
              ],
              ["profile", "groupTypes", "followups"],
            )}
            phase="ready"
          />
        </div>
      </Section>

      <Section
        title="The mark on a control"
        note="The guide rings the control its step names and points an arrow at it, from outside the screen's own markup. Nothing is dimmed and nothing is blocked: the control underneath works the whole time."
      >
        <div className="flex flex-col items-start gap-5">
          <Button variant="secondary" onClick={() => setPointing((on) => !on)}>
            {pointing ? "Take the mark off" : "Point at the button below"}
          </Button>

          <div className="rounded-[14px] border border-line bg-surface p-8">
            <Button data-guide="design-gallery-target">Pair a station</Button>
          </div>

          <Point
            stops={
              pointing
                ? [
                    {
                      target: "design-gallery-target",
                      body: "Click Add a station, give it a name, and select the rooms it will handle.",
                    },
                  ]
                : []
            }
            title="Set up a check-in station"
            onClose={() => setPointing(false)}
          />
        </div>
      </Section>
    </div>
  );
}
