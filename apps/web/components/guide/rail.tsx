"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircleHelp, ListChecks, PanelRightClose, PanelRightOpen, X } from "lucide-react";
import {
  Banner, Button, Dialog, DialogContent, DialogClose, DialogFooter,
  IconButton, Sheet, SheetContent, SheetTrigger, cn,
} from "@connectapp/ui";
import { plural, t } from "@connectapp/i18n";
import type { SetupPhase, SetupStep } from "@connectapp/db";
import { stepOnScreen } from "@/lib/setup-guide";
import { Help } from "@/components/help";
import { useFormError } from "@/lib/form-error";
import { setGuideShut, showGuide, skip } from "./guide-actions";
import { GuideBody, type RailStep } from "./body";
import { Point } from "./point";

/**
 * R22.1, R22.2, R22.3. The setup guide, beside whichever screen is open.
 *
 * Each step of setting up happens on the screen that really does that job,
 * which is the right place for it and the wrong place to lose the thread: the
 * old setup page vanished the moment somebody pressed a step, and the dock that
 * replaced it carried five words and no idea what to do on arrival.
 *
 * So the guide comes along, and it knows where it has sent you. Open the screen
 * a step points at and that step rises in its phase and names the control to
 * press, and the card it means is ringed. Everywhere else the rail carries the
 * phase and what is next.
 *
 * It is a column beside the screen rather than a box floating over it, because
 * the corner it used to float in is the corner a panel's footer lands in, and
 * because the blur it used to carry is refused by the design pass.
 *
 * Nothing is stored about progress. Every step is answered by reading the
 * church's own records, so undoing the work opens the step again.
 */
export function Rail({
  church,
  steps,
  settled,
  left,
  phase,
  complete,
  shut: shutAtFirst,
}: {
  church: string;
  steps: RailStep[];
  settled: number;
  left: number;
  phase: SetupPhase;
  complete: boolean;
  /** Read from the cookie on the server, so the rail draws at its own width. */
  shut: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [shut, setShut] = React.useState(shutAtFirst);
  const [asking, setAsking] = React.useState(false);
  const [onPhone, setOnPhone] = React.useState(false);
  const [error, setError] = useFormError(asking);
  const [pending, startTransition] = React.useTransition();

  /*
   * Which phase is being shown. It follows the church's own progress until
   * somebody opens another one by hand, because a church that wants to look at
   * giving before it has named a room should not have to argue with us.
   */
  const [opened, setOpened] = React.useState<SetupPhase | null>(null);

  // A step opened by hand belongs to the screen it was opened on.
  React.useEffect(() => setOpened(null), [pathname]);

  const close = (next: boolean) => {
    setShut(next);
    void setGuideShut(next);
  };

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const answer = await work();
      setError(answer.error);
      if (!answer.error) router.refresh();
    });

  const onSkip = (which: SetupStep, on: boolean) => run(() => skip(which, on));
  const count = t("setup.count", { done: String(settled), all: String(steps.length) });

  const onScreen = stepOnScreen(pathname);
  const here = onScreen?.step ?? null;

  /*
   * Which phase is open. The one holding the screen somebody is looking at,
   * so a church that opens Rooms is not left reading the first hour, then
   * whatever they opened by hand, and only then the church's own progress.
   */
  const showing = opened ?? onScreen?.phase ?? phase;

  const body = (
    <GuideBody
      steps={steps}
      phase={showing}
      here={here}
      busy={pending}
      onSkip={onSkip}
      onOpenPhase={setOpened}
      onGo={() => setOnPhone(false)}
    />
  );

  /*
   * The control this screen's step names, while that step is still open. The
   * guide rings it and points at it, which is the difference between knowing
   * the answer is on this screen and knowing what to press.
   */
  const step = onScreen ? steps.find((one) => one.step === onScreen.step) : null;
  const pointAt =
    onScreen && step && !step.done && !step.skipped ? (onScreen.target ?? null) : null;

  /* The confirm, and the two kinds of closing it offers. For this visit is the
     common one; for good is the same decision as skipping the whole of setting
     up, so it is said in those words rather than hidden behind an x. */
  const confirm = (
    <Dialog open={asking} onOpenChange={setAsking}>
      <DialogContent title={t("setup.hide.title")}>
        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant="ghost"
              data-dismiss
              onClick={() => {
                setAsking(false);
                run(() => showGuide(false));
              }}
            >
              {t("setup.hide.ever")}
            </Button>
          </DialogClose>
          <Button
            onClick={() => {
              setAsking(false);
              close(true);
            }}
          >
            {t("setup.hide.now")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  /* R24.6. On a phone there is no room for a column, so the same guide opens
     as a panel from a pill that sits clear of the tab bar. */
  const pill = (
    <Sheet open={onPhone} onOpenChange={setOnPhone}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "fixed left-4 z-40 flex cursor-pointer items-center gap-2 rounded-full lg:hidden",
            "bottom-[calc(5rem+env(safe-area-inset-bottom))]",
            "border border-line-strong bg-surface px-3.5 py-2 shadow-md",
            "text-[13px] font-semibold text-fg",
          )}
        >
          <ListChecks className="size-4" aria-hidden />
          {t("setup.count", { done: String(settled), all: String(steps.length) })}
        </button>
      </SheetTrigger>
      <SheetContent title={t("setup.title", { name: church })} closeLabel={t("common.close")}>
        {error ? <Banner tone="danger">{t(error as never)}</Banner> : null}
        {body}
      </SheetContent>
    </Sheet>
  );

  if (shut) {
    return (
      <>
        {/* Down to its edge, with how far through on it, so the guide is never
            gone by accident: this is the press that brings it back. */}
        <button
          type="button"
          onClick={() => close(false)}
          aria-label={t("setup.open")}
          title={undefined}
          className={cn(
            "sticky top-0 hidden h-dvh shrink-0 cursor-pointer border-l border-line lg:flex",
            "w-11 flex-col items-center justify-start gap-3 bg-surface pt-5",
            "transition-colors duration-instant hover:bg-sunken",
          )}
        >
          <PanelRightOpen className="size-[18px] shrink-0 text-fg-muted" aria-hidden />
          <span
            aria-hidden
            className="text-[12px] font-semibold tabular-nums text-fg-muted [writing-mode:vertical-rl]"
          >
            {settled} / {steps.length}
          </span>
        </button>
        {pill}
        {/* Collapsed still points: the rail is out of the way, and the step
            it had open is still the step. */}
        <Point target={pointAt} />
      </>
    );
  }

  return (
    <>
      <aside
        aria-label={t("setup.title", { name: church })}
        aria-busy={pending}
        /*
         * Its own column, so nothing of the screen is ever underneath it, and
         * sticky rather than fixed, so it keeps its place while a long list
         * scrolls past while still sitting in the frame's own flow.
         */
        className="sticky top-0 hidden h-dvh w-[332px] shrink-0 self-start overflow-y-auto border-l border-line bg-surface lg:block"
      >
        <div className="flex flex-col gap-4 p-5">
          {error ? <Banner tone="danger">{t(error as never)}</Banner> : null}

          <div className="flex items-start justify-between gap-2">
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px] leading-[19px] font-semibold text-balance text-fg">
                {t("setup.title", { name: church })}
              </span>
              <span className="text-[length:var(--d-text-caption)] text-fg-muted">
                {left === 0 ? t("setup.left.none") : plural("setup.left", left)}
              </span>
            </span>
            <span className="-mr-1.5 flex shrink-0 items-center">
              <IconButton label={t("setup.shut")} variant="ghost" onClick={() => close(true)}>
                <PanelRightClose />
              </IconButton>
              <IconButton label={t("setup.hide")} variant="ghost" onClick={() => setAsking(true)}>
                <X />
              </IconButton>
            </span>
          </div>

          {complete ? (
            <div className="flex flex-col gap-1 rounded-[12px] bg-primary-soft p-4">
              <span className="text-[14px] font-semibold text-fg">
                {t("setup.done.title", { name: church })}
              </span>
              <span className="text-[13px] leading-5 text-fg-muted">{t("setup.done.body")}</span>
            </div>
          ) : null}

          {body}

          {/* R22.2. Help, on whatever screen this is. It has been built and
              unreachable since the redesign took the question mark out of the
              top bar, and the guide is the one part of the frame beside every
              screen. */}
          <div className="mt-1 border-t border-line pt-3">
            <Help
              trigger={
                <Button variant="ghost" className="w-full justify-start">
                  <CircleHelp />
                  {t("setup.helpHere")}
                </Button>
              }
            />
          </div>

          <span className="sr-only">{count}</span>
        </div>
      </aside>

      {pill}
      {confirm}
      <Point target={pointAt} />
    </>
  );
}
