"use client";

/**
 * HRT-378, R22.1, R22.2. Teaching a church to use the website builder.
 *
 * The setup guide points a church at a screen and says what to press on it.
 * That is right for a screen with one job, and it is not enough here: a
 * builder is twelve jobs on one screen, and a volunteer who has never made a
 * website does not know that the palette is where the look lives or that a
 * heading is pressed twice to type in it.
 *
 * So this walks the whole thing, one control at a time, in the order somebody
 * actually meets them: choose a design, read the page, change the words, set
 * them, bring in a photograph, add a section, add a page, change the look,
 * look at it as a visitor, publish. Each card names one control and rings it,
 * nothing is dimmed, nothing is blocked, and the control underneath works
 * while the card is up. Back and Next move it; the cross ends it.
 *
 * It is offered once and remembered. A church that already knows its way
 * around closes it and never sees it again, and the Design panel offers it
 * back for whoever does want it.
 */

import * as React from "react";
import { t } from "@connectapp/i18n";
import { Point } from "@/components/guide/point";

const SEEN = "connectapp-website-walk";

/** One card: the control it rings, and what it says about it. */
interface Stop {
  target: string;
  title: string;
  body: string;
  /** Which half of the walk it belongs to. */
  when: "before" | "after";
  /**
   * Waits on the reader doing the thing rather than on them reading the card.
   * The walk carries on by itself once the screen changes.
   */
  waits?: true;
}

const STOPS: Stop[] = [
  {
    /* Nothing to ring: this card says what the screen is for, and a ring round
       the whole gallery is a ring round nothing. */
    target: "",
    title: "website.walk.1.title",
    body: "website.walk.1",
    when: "before",
  },
  {
    target: "use-design",
    title: "website.walk.2.title",
    body: "website.walk.2",
    when: "before",
    /* The press that makes the website is the reader's to make, and the walk
       picks itself up on the other side of it. */
    waits: true,
  },
  {
    target: "website-canvas",
    title: "website.walk.3.title",
    body: "website.walk.3",
    when: "after",
  },
  {
    target: "website-canvas",
    title: "website.walk.4.title",
    body: "website.walk.4",
    when: "after",
  },
  {
    target: "website-inspector",
    title: "website.walk.5.title",
    body: "website.walk.5",
    when: "after",
  },
  {
    target: "rail-media",
    title: "website.walk.6.title",
    body: "website.walk.6",
    when: "after",
  },
  {
    target: "rail-add",
    title: "website.walk.7.title",
    body: "website.walk.7",
    when: "after",
  },
  {
    target: "rail-pages",
    title: "website.walk.8.title",
    body: "website.walk.8",
    when: "after",
  },
  {
    target: "rail-design",
    title: "website.walk.9.title",
    body: "website.walk.9",
    when: "after",
  },
  {
    target: "website-preview",
    title: "website.walk.10.title",
    body: "website.walk.10",
    when: "after",
  },
  {
    target: "publish-website",
    title: "website.walk.11.title",
    body: "website.walk.11",
    when: "after",
  },
];

/** Whether this church has been offered the walk before. */
export function walkSeen(): boolean {
  try {
    return window.localStorage.getItem(SEEN) === "yes";
  } catch {
    /* A private window, where there is nothing to remember. */
    return false;
  }
}

function remember(): void {
  try {
    window.localStorage.setItem(SEEN, "yes");
  } catch {
    /* Nothing to remember in a private window. */
  }
}

export function Walk({
  started,
  open,
  onClose,
  onNeeds,
}: {
  /** Whether the church has a website yet, which decides where the walk is. */
  started: boolean;
  open: boolean;
  onClose: () => void;
  /**
   * What the walk needs on screen for its current card: the panel it is about
   * to point into. The workspace opens it, because a ring round a closed rail
   * item teaches nobody what is behind it.
   */
  onNeeds: (panel: "pages" | "design" | "media" | "inspector" | null) => void;
}) {
  /*
   * One walk of eleven across two screens. The first two cards are the gallery
   * and only exist before a church has a website; the other nine are the
   * editor. The count is of the whole of it either way, because "2 of 2"
   * followed by "1 of 9" reads as two walks and invites somebody to stop at
   * the end of the first one.
   */
  const first = STOPS.findIndex((one) => one.when === (started ? "after" : "before"));
  const mine = STOPS.filter((one) => one.when === (started ? "after" : "before"));
  const [at, setAt] = React.useState(0);

  /* Choosing a design takes the gallery off the screen, so the walk moves on
     with it rather than ringing a control that has gone. */
  const was = React.useRef(started);
  React.useEffect(() => {
    if (started !== was.current) {
      was.current = started;
      setAt(0);
    }
  }, [started]);

  const here = Math.min(at, Math.max(0, mine.length - 1));
  const wants = mine[here]?.target;
  const needs = React.useRef(onNeeds);
  needs.current = onNeeds;
  React.useEffect(() => {
    if (!open) return;
    if (wants === "rail-pages") needs.current("pages");
    else if (wants === "rail-design") needs.current("design");
    else if (wants === "rail-media") needs.current("media");
    /* The panel can be put away, and a card pointing at a panel that is not
       there draws nothing at all. */
    else if (wants === "website-inspector") needs.current("inspector");
    else needs.current(null);
  }, [wants, open]);

  if (!open || mine.length === 0) return null;

  const stop = mine[here]!;
  const stopWalking = () => {
    remember();
    onClose();
  };

  return (
    <Point
      title={t(stop.title as "website.walk.1.title")}
      stops={mine.map((one) => ({
        target: one.target,
        body: t(one.body as "website.walk.1"),
      }))}
      at={here}
      count={{ at: first + here + 1, of: STOPS.length }}
      waits={stop.waits}
      onBack={() => setAt((n) => Math.max(0, n - 1))}
      onNext={() => {
        if (here >= mine.length - 1) {
          stopWalking();
          return;
        }
        setAt((n) => n + 1);
      }}
      lastLabel={t("setup.walk.finish")}
      onClose={stopWalking}
    />
  );
}
