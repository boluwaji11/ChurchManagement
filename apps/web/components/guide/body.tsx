"use client";

import * as React from "react";
import { Check, ChevronRight, Minus, MoveRight } from "lucide-react";
import { cn } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import type { SetupPhase, SetupStep } from "@connectapp/db";
import { GUIDE_BY_STEP } from "@/lib/setup-guide";
import { NavLink } from "@/components/nav-link";
import { Opening } from "@/components/opening";

export interface RailStep {
  step: SetupStep;
  phase: SetupPhase;
  done: boolean;
  skipped: boolean;
}

export const PHASES: readonly SetupPhase[] = ["hour", "before", "ready"];

/** Brings the control a step names back into view, for Show me. */
function showMe(target: string | undefined) {
  if (!target) return;
  const found = document.querySelector(`[data-guide="${CSS.escape(target)}"]`);
  found?.scrollIntoView({ block: "center", behavior: "smooth" });
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
  steps,
  phase,
  here,
  busy,
  onSkip,
  onOpenPhase,
  onGo,
}: {
  steps: RailStep[];
  /** The phase being shown, which the caller holds so it survives a press. */
  phase: SetupPhase;
  /** The step whose screen is open, if this is one of them. */
  here: SetupStep | null;
  busy: boolean;
  onSkip: (step: SetupStep, on: boolean) => void;
  onOpenPhase: (phase: SetupPhase) => void;
  /** Closes the panel the body is in, where it is in one. */
  onGo?: () => void;
}) {
  const next = steps.find((one) => !one.done && !one.skipped);

  /*
   * Which step is telling its whole story. The one whose screen is open, or
   * the one that is next, unless somebody has opened another by hand: twelve
   * steps each explaining themselves is a column nobody reads, and one is
   * what somebody is doing now.
   */
  const [opened, setOpened] = React.useState<SetupStep | null>(null);
  const telling = opened ?? here ?? next?.step ?? null;

  return (
    <div className="flex flex-col gap-1">
      {PHASES.map((one, phaseIndex) => {
        const open = one === phase;
        const mine = steps.filter((step) => step.phase === one);
        const doneHere = mine.filter((step) => step.done || step.skipped).length;
        const allDone = doneHere === mine.length;

        return (
          <section key={one} className="flex flex-col">
            <button
              type="button"
              onClick={() => onOpenPhase(one)}
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
                  "grid size-[22px] shrink-0 place-items-center rounded-[7px] text-[10px] font-bold tabular-nums",
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
                    "text-[13px] leading-[17px] font-semibold",
                    open ? "text-fg" : "text-fg-muted",
                  )}
                >
                  {t(`setup.phase.${one}` as never)}
                </span>
                <span className="truncate text-[11px] leading-[15px] text-fg-subtle">
                  {open
                    ? t(`setup.phase.${one}.why` as never)
                    : t("setup.count", { done: String(doneHere), all: String(mine.length) })}
                </span>
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
              <ol className="m-0 flex list-none flex-col p-0 pt-1">
                {mine.map((step, i) => (
                  <Row
                    key={step.step}
                    step={step}
                    last={i === mine.length - 1}
                    here={here === step.step}
                    nextUp={next?.step === step.step}
                    telling={telling === step.step}
                    busy={busy}
                    onTell={() =>
                      setOpened(telling === step.step ? ("" as SetupStep) : step.step)
                    }
                    onSkip={(on) => onSkip(step.step, on)}
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
  telling,
  busy,
  onTell,
  onSkip,
  onGo,
}: {
  step: RailStep;
  last: boolean;
  here: boolean;
  nextUp: boolean;
  telling: boolean;
  busy: boolean;
  onTell: () => void;
  onSkip: (on: boolean) => void;
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
            <span className="size-2 rounded-full bg-primary" />
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
              "min-w-0 flex-1 text-[13px] leading-[19px]",
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

          {here && !step.done ? (
            <span className="mt-0.5 shrink-0 rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-fg">
              {t("setup.here")}
            </span>
          ) : null}
          {step.skipped && !step.done ? (
            <span className="mt-0.5 shrink-0 rounded-full bg-sunken px-1.5 py-px text-[10px] font-semibold text-fg-subtle">
              {t("setup.skipped")}
            </span>
          ) : null}
        </button>

        {telling ? (
          <div className="mt-0.5 flex flex-col gap-2">
            {/* What it is, then why a church should care. The second one is
                the question a volunteer actually has, and no screen in the
                product is the place to answer it. */}
            <p className="m-0 text-[12px] leading-[17px] text-fg-muted">
              {t(`setup.what.${step.step}` as never)}
            </p>
            <p className="m-0 flex gap-1.5 text-[12px] leading-[17px] text-fg">
              <MoveRight aria-hidden className="mt-[3px] size-3 shrink-0 text-primary" />
              <span>{t(`setup.why.${step.step}` as never)}</span>
            </p>

            {here && !step.done ? (
              <p className="m-0 rounded-[9px] bg-primary-soft px-2.5 py-2 text-[12px] leading-[17px] font-medium text-fg">
                {t(`setup.at.${step.step}` as never)}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {step.done ? null : here ? (
                where?.target ? (
                  <button
                    type="button"
                    onClick={() => showMe(where.target)}
                    className="cursor-pointer rounded text-[12px] font-semibold text-primary"
                  >
                    {t("setup.showMe")}
                  </button>
                ) : null
              ) : step.skipped ? null : (
                <NavLink
                  href={where?.href ?? "/dashboard"}
                  onClick={onGo}
                  className="inline-flex items-center gap-0.5 rounded text-[12px] font-semibold text-primary no-underline"
                >
                  {t("setup.do")}
                  <ChevronRight className="size-3.5" aria-hidden />
                  <Opening />
                </NavLink>
              )}

              {step.done ? null : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSkip(!step.skipped)}
                  className="cursor-pointer rounded text-[12px] text-fg-muted underline underline-offset-4 transition-colors duration-instant hover:text-fg disabled:cursor-default"
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
