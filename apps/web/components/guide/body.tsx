"use client";

import * as React from "react";
import { Check, ChevronRight, Minus, MoveRight } from "lucide-react";
import { cn } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import type { SetupPhase, SetupStep } from "@connectapp/db";
import { GUIDE_BY_STEP, GUIDE_PHASES } from "@/lib/setup-guide";
import { NavLink } from "@/components/nav-link";
import { Opening } from "@/components/opening";
import { Cut } from "./cut";

export interface RailStep {
  step: SetupStep;
  phase: SetupPhase;
  done: boolean;
  skipped: boolean;
}

/**
 * R22.1. The guide's contents: the three phases, and the steps of whichever
 * phase is open, drawn as a path.
 *
 * A path rather than a list of rows, because a church is being told how far
 * along it is and a stack of boxes says nothing about order. A marker each,
 * the thread running between them, and the thread coloured as far as the
 * church has got.
 *
 * Written once here because it is shown in two shapes: a column beside the
 * screen on a wide one, and a panel on a phone, where there is no room for a
 * column.
 */
export function GuideBody({
  steps: given,
  phase,
  pinned,
  here,
  busy,
  onSkip,
  onOpenPhase,
  onShow,
  onGo,
}: {
  steps: RailStep[];
  /** The phase being shown, which the caller holds so it survives a press. */
  phase: SetupPhase;
  /** Whether that phase was opened by hand, and so should be left alone. */
  pinned: boolean;
  /** The step whose screen is open, if this is one of them. */
  here: SetupStep | null;
  busy: boolean;
  onSkip: (step: SetupStep, on: boolean) => void;
  onOpenPhase: (phase: SetupPhase) => void;
  /** Opens this step's card on the work, and scrolls its control into view. */
  onShow: (step: SetupStep) => void;
  /** Closes the panel the body is in, where it is in one. */
  onGo?: () => void;
}) {
  /*
   * Skipping shows at once rather than when the server answers.
   *
   * The step list is the church's own records read on the server, which is
   * what keeps the guide honest, and a round trip is a long time to watch a
   * press do nothing. The press is drawn immediately and the guess is dropped
   * the moment the records come back saying the same thing.
   */
  const [guess, setGuess] = React.useState<Partial<Record<SetupStep, boolean>>>({});
  const signature = given.map((one) => `${one.step}${one.done}${one.skipped}`).join();
  React.useEffect(() => setGuess({}), [signature]);

  const steps = given.map((one) =>
    guess[one.step] === undefined ? one : { ...one, skipped: guess[one.step]! },
  );

  const next = steps.find((one) => !one.done && !one.skipped);

  /*
   * Which phase is open. Answering the last step of one opens the next at
   * once, rather than when the records come back, because the press that
   * settled it is the press that should move the guide on. A phase somebody
   * opened by hand is left alone, even once it is settled, because they are
   * reading it.
   */
  const settled = (which: SetupPhase) =>
    !steps.some((one) => one.phase === which && !one.done && !one.skipped);

  /*
   * Standing on a step's screen holds its phase open, so walking onto a step
   * already done shows that step rather than jumping the column past it. An
   * answer is not walking: skipping the step you are standing on is asking the
   * guide to move on, so it lets go of the phase and the next one opens.
   * Arriving anywhere takes hold again.
   */
  const [released, setReleased] = React.useState(false);
  React.useEffect(() => setReleased(false), [here]);

  const showing =
    (pinned && !released) || !settled(phase)
      ? phase
      : (GUIDE_PHASES.find((one) => !settled(one)) ?? phase);

  /*
   * A phase somebody has opened or shut by hand, which beats whatever the
   * guide would have chosen. Every heading is a toggle at any time, the open
   * one included: a church that has read a section wants it out of the way,
   * and a church that finished the basics on Tuesday wants to look at them
   * again on Thursday. Cleared on arriving at a step's screen, because from
   * there the guide is following the screen again.
   */
  const [byHand, setByHand] = React.useState<Partial<Record<SetupPhase, boolean>>>({});
  React.useEffect(() => setByHand({}), [here]);

  /*
   * A step that has just been answered stops being the current one and the
   * next takes over. Without this, finishing the step whose screen you are on
   * left it open and struck through while the step below went active, and two
   * of them read as current.
   */
  const answered = (which: SetupStep | null) =>
    Boolean(which) && steps.some((one) => one.step === which && (one.done || one.skipped));

  /*
   * The one step that is now: the one whose screen is open, or the one that
   * is next. Its marker breathes, which is the whole of how somebody finds
   * their place again after looking away.
   */
  const now = (answered(here) ? null : here) ?? next?.step ?? null;

  /*
   * Which step is telling its whole story. Sixteen steps each explaining
   * themselves is a column nobody reads, so one does, and it is the one
   * somebody is working on.
   *
   * A press always wins. Null means nobody has pressed anything and the guide
   * chooses; the empty string means a press closed the one that was open. The
   * guide's own choice skips an answered step, because finishing the step you
   * are standing on should hand the story to the next one rather than leave a
   * struck-through step open. A step somebody opens by hand opens whatever
   * state it is in, which is the only way to reach Undo skip.
   */
  const [opened, setOpened] = React.useState<SetupStep | "" | null>(null);

  const telling =
    opened === null
      ? ((answered(here) ? null : here) ?? next?.step ?? null)
      : (opened || null);

  return (
    <div className="flex flex-col gap-1">
      {GUIDE_PHASES.map((one, phaseIndex) => {
        const open = byHand[one] ?? one === showing;
        const mine = steps.filter((step) => step.phase === one);
        const doneHere = mine.filter((step) => step.done || step.skipped).length;
        const allDone = doneHere === mine.length;

        return (
          <section
            key={one}
            /* The same hairline the foot of the rail carries, so the four
               phases read as four blocks rather than one long column. */
            className={cn(
              "flex flex-col",
              phaseIndex > 0 && "mt-2 border-t border-line pt-2",
            )}
          >
            <button
              type="button"
              onClick={() => {
                /*
                 * A press always wins, so it takes back the hold an answer let
                 * go of. Skipping a step releases its phase on purpose, and
                 * until this reset that release outlived the press: a settled
                 * phase could not be opened again.
                 */
                setReleased(false);
                setByHand((was) => ({ ...was, [one]: !open }));
                onOpenPhase(one);
              }}
              aria-expanded={open}
              className={cn(
                "-mx-1.5 flex cursor-pointer items-center gap-2.5 rounded-[10px] px-1.5 py-2 text-left",
                "transition-colors duration-instant hover:bg-sunken",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-[24px] shrink-0 place-items-center rounded-[7px] text-[11px] font-bold tabular-nums",
                  allDone
                    ? "bg-primary text-primary-fg"
                    : open
                      ? "bg-primary-soft text-primary"
                      : "bg-sunken text-fg-subtle",
                )}
              >
                {allDone ? <Check className="size-3" /> : phaseIndex + 1}
              </span>

              <span className="flex min-w-0 flex-1 flex-col">
                <span
                  className={cn(
                    "text-[16px] leading-[21px] font-semibold",
                    open ? "text-fg" : "text-fg-muted",
                  )}
                >
                  {t(`setup.phase.${one}` as never)}
                </span>
                <Cut className="text-[13px] leading-[18px] text-fg-subtle">
                  {open
                    ? t(`setup.phase.${one}.why` as never)
                    : t("setup.count", { done: String(doneHere), all: String(mine.length) })}
                </Cut>
              </span>

              <ChevronRight
                aria-hidden
                className={cn(
                  "size-4 shrink-0 text-fg-subtle transition-transform duration-instant",
                  open && "rotate-90",
                )}
              />
            </button>

            {open ? (
              <ol
                data-guide-steps
                /* Indented to the heading's words rather than its number, so the
                   steps read as belonging to the section above them. */
                className="m-0 flex list-none flex-col p-0 pt-1 pl-[32px]"
              >
                {mine.map((step, i) => (
                  <Row
                    key={step.step}
                    step={step}
                    last={i === mine.length - 1}
                    here={here === step.step}
                    nextUp={next?.step === step.step}
                    now={now === step.step}
                    telling={telling === step.step}
                    busy={busy}
                    onTell={() => setOpened(telling === step.step ? "" : step.step)}
                    onSkip={(on) => {
                      setGuess((was) => ({ ...was, [step.step]: on }));
                      setOpened(null);
                      setReleased(true);
                      onSkip(step.step, on);
                    }}
                    onShow={onShow}
                    onGo={onGo}
                  />
                ))}
              </ol>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

/**
 * One step on the path: its marker, the thread down to the next one, and what
 * it is for.
 */
function Row({
  step,
  last,
  here,
  nextUp,
  now,
  telling,
  busy,
  onTell,
  onSkip,
  onShow,
  onGo,
}: {
  step: RailStep;
  last: boolean;
  here: boolean;
  nextUp: boolean;
  /** The step somebody is on, whose marker breathes. */
  now: boolean;
  telling: boolean;
  busy: boolean;
  onTell: () => void;
  onSkip: (on: boolean) => void;
  onShow: (step: SetupStep) => void;
  onGo?: () => void;
}) {
  const where = GUIDE_BY_STEP.get(step.step);
  const name = t(`setup.step.${step.step}` as never);

  return (
    <li className="flex items-stretch gap-2.5">
      {/* The path itself: a marker, and the thread to the next marker with a
          bead at its middle. The thread is coloured as far as the church has
          got, so the column reads as a journey rather than as a tally. */}
      <span className="flex w-6 shrink-0 flex-col items-center" aria-hidden>
        <span
          data-guide-now={now && !step.done && !step.skipped ? "" : undefined}
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-full transition-colors duration-fast",
            step.done
              ? "bg-primary text-primary-fg"
              : step.skipped
                ? "border-2 border-dashed border-line-strong bg-surface text-fg-subtle"
                : here || nextUp
                  ? "border-2 border-primary bg-surface"
                  : "border-2 border-line-strong bg-surface",
          )}
        >
          {step.done ? (
            <Check className="size-3.5" strokeWidth={3} />
          ) : step.skipped ? (
            <Minus className="size-3" strokeWidth={3} />
          ) : here || nextUp ? (
            <span data-guide-pip className="size-2 rounded-full bg-primary" />
          ) : null}
        </span>

        {/* The thread, with a bead at its middle. It is drawn at its own
            width rather than a hairline, because a one-pixel line between two
            markers reads as a rendering fault rather than as a path. */}
        {last ? null : (
          <span
            className={cn(
              "relative my-1.5 w-[3px] flex-1 rounded-full",
              step.done ? "bg-primary/55" : "bg-line-strong",
            )}
          >
            <span
              className={cn(
                "absolute top-1/2 left-1/2 size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full",
                "shadow-[0_0_0_3px_var(--surface)]",
                step.done ? "bg-primary/55" : "bg-line-strong",
              )}
            />
          </span>
        )}
      </span>

      <div className={cn("flex min-w-0 flex-1 flex-col", last ? "pb-1" : "pb-5")}>
        {/* The name is the press that tells the story, so every step can be
            asked what it is for without leaving the column. */}
        <button
          type="button"
          onClick={onTell}
          aria-expanded={telling}
          className={cn(
            "-mx-1.5 -mt-0.5 flex cursor-pointer items-start gap-2 rounded-[9px] px-1.5 py-1 text-left",
            "transition-colors duration-instant hover:bg-sunken",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
          )}
        >
          <span
            className={cn(
              "min-w-0 flex-1 text-[15px] leading-[21px]",
              step.done
                ? "text-fg-subtle line-through"
                : step.skipped
                  ? "text-fg-subtle"
                  : here || nextUp
                    ? "font-semibold text-fg"
                    : "text-fg-muted",
            )}
          >
            {name}
          </span>

          {/* The step in play carries the badge wherever the reader is, so the
              column says which one is live rather than only saying so on the
              screen that does it. It reads Here on that screen and Next
              anywhere else. A step that is answered, either way, is neither. */}
          {now && !step.done && !step.skipped ? (
            <span className="mt-0.5 shrink-0 rounded-full bg-primary px-2 py-px text-[11px] font-semibold text-primary-fg">
              {here ? t("setup.here") : t("setup.next")}
            </span>
          ) : null}
          {step.skipped && !step.done ? (
            <span className="mt-0.5 shrink-0 rounded-full bg-sunken px-2 py-px text-[11px] font-semibold text-fg-subtle">
              {t("setup.skipped")}
            </span>
          ) : null}
        </button>

        {telling ? (
          <div data-guide-telling className="mt-0.5 flex flex-col gap-2">
            {/* What it is, then why a church should care. The second one is
                the question a volunteer actually has, and no screen in the
                product is the place to answer it. */}
            <p className="m-0 text-[14px] leading-[21px] text-fg-muted">
              {t(`setup.what.${step.step}` as never)}
            </p>
            <p className="m-0 flex gap-1.5 text-[14px] leading-[21px] text-fg">
              <MoveRight aria-hidden className="mt-[3px] size-3 shrink-0 text-primary" />
              <span>{t(`setup.why.${step.step}` as never)}</span>
            </p>

            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 pl-[18px]">
              {/* Show me is the whole of it: on this screen it points at the
                  control again, and anywhere else it opens the screen and
                  points when it gets there. The instruction itself is on the
                  work, not in this column. */}
              {step.done || step.skipped ? null : here ? (
                <button
                  type="button"
                  onClick={() => onShow(step.step)}
                  className="inline-flex cursor-pointer items-center gap-0.5 rounded text-[13px] font-semibold text-primary"
                >
                  {t("setup.showMe")}
                  <ChevronRight className="size-3.5" aria-hidden />
                </button>
              ) : (
                <NavLink
                  href={where?.href ?? "/dashboard"}
                  onClick={() => {
                    onShow(step.step);
                    onGo?.();
                  }}
                  className="inline-flex items-center gap-0.5 rounded text-[13px] font-semibold text-primary no-underline"
                >
                  {t("setup.showMe")}
                  <ChevronRight className="size-3.5" aria-hidden />
                  <Opening />
                </NavLink>
              )}

              {step.done ? null : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSkip(!step.skipped)}
                  className="cursor-pointer rounded text-[13px] text-fg-muted underline underline-offset-4 transition-colors duration-instant hover:text-fg disabled:cursor-default"
                >
                  {step.skipped ? t("setup.unskip") : t("setup.skip")}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </li>
  );
}
