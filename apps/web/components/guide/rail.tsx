"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircleHelp, ListChecks, PanelRightClose, PanelRightOpen } from "lucide-react";
import {
  Banner, Button, Dialog, DialogContent, DialogClose, DialogFooter,
  IconButton, Sheet, SheetContent, SheetTrigger, cn,
} from "@connectapp/ui";
import { plural, t } from "@connectapp/i18n";
import type { SetupPhase, SetupStep } from "@connectapp/db";
import { GUIDE_BY_STEP, stepOnScreen } from "@/lib/setup-guide";
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

  // A step opened by hand, and a card that was closed, belong to the screen
  // they happened on.
  React.useEffect(() => {
    setOpened(null);
    setClosed(null);
    /* An invitation reaches the screen it was made for and goes no further,
       so pressing Show me and then wandering off leaves nothing behind. */
    setInvited((was) => (was && stepOnScreen(pathname)?.step === was ? was : null));
  }, [pathname]);

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
   * Which step the guide was asked to show, and whether its card is still up.
   *
   * The card only ever appears because somebody pressed Show me. Opening the
   * importer from the More menu is a church doing its own work, and a coach
   * mark arriving uninvited over it is the product talking over somebody who
   * did not ask. Guidance that is asked for is also the guidance that gets
   * read: the rail is always there to ask with.
   */
  const [invited, setInvited] = React.useState<SetupStep | null>(null);
  const [closed, setClosed] = React.useState<SetupStep | null>(null);

  const show = (which: SetupStep) => {
    setInvited(which);
    setClosed(null);
    const where = GUIDE_BY_STEP.get(which);
    if (!where?.target) return;
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-guide="${CSS.escape(where.target!)}"]`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  };

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
      onShow={show}
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
    onScreen
    && step
    && !step.done
    && !step.skipped
    && invited === onScreen.step
    && closed !== onScreen.step
      ? (onScreen.target ?? null)
      : null;

  /* The card carries the step's name and the one sentence naming what to
     press. Both are read here because the card is drawn from the frame. */
  const card = here ? (
    <Point
      target={pointAt}
      title={t(`setup.step.${here}` as never)}
      body={t(`setup.at.${here}` as never)}
      onClose={() => setClosed(here)}
    />
  ) : null;

  /* The one way the guide goes for good, offered only once there is nothing
     left in it to lose. */
  const confirm = (
    <Dialog open={asking} onOpenChange={setAsking}>
      <DialogContent alert title={t("setup.putAway.title")}>
        <p className="mb-5 text-[length:var(--d-text-body)] text-fg">
          {t("setup.putAway.body")}
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" data-dismiss>
              {t("setup.putAway.keep")}
            </Button>
          </DialogClose>
          <Button
            onClick={() => {
              setAsking(false);
              run(() => showGuide(false));
            }}
          >
            {t("setup.putAway")}
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
          /* R24.6. Under the bell, which is where the frame already keeps the
             things that are about the whole screen rather than about the
             screen's own work. The bottom corners belong to the tab bar and
             to messages. */
          className={cn(
            "fixed z-40 flex cursor-pointer items-center gap-2 rounded-full lg:hidden",
            "right-[max(1rem,env(safe-area-inset-right))]",
            "top-[calc(4.25rem+env(safe-area-inset-top))]",
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
            "w-12 flex-col items-center justify-start gap-3.5 bg-surface pt-5",
            "transition-colors duration-instant hover:bg-sunken",
          )}
        >
          <PanelRightOpen className="size-[18px] shrink-0 text-fg-muted" aria-hidden />
          <span
            aria-hidden
            className="flex items-center gap-2.5 text-[14px] font-bold tracking-[0.12em] text-fg-muted uppercase [writing-mode:vertical-rl]"
          >
            {t("setup.tab")}
            <span className="tracking-normal tabular-nums text-primary">
              {settled}/{steps.length}
            </span>
          </span>
        </button>
        {pill}
        {/* Collapsed still points: the rail is out of the way, and the step
            it had open is still the step. */}
        {card}
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
        className="sticky top-0 hidden h-dvh w-[380px] shrink-0 self-start overflow-y-auto border-l border-line bg-surface lg:block"
      >
        <div className="flex flex-col gap-4 p-5">
          {error ? <Banner tone="danger">{t(error as never)}</Banner> : null}

          <div className="flex items-start justify-between gap-2">
            <span className="flex min-w-0 flex-col gap-0.5">
              {/* One line. A church with a long name loses the end of it to
                  an ellipsis rather than pushing the path down the column. */}
              <span className="truncate font-display text-[18px] leading-[24px] whitespace-nowrap text-fg">
                {t("setup.title", { name: church })}
              </span>
              <span className="text-[length:var(--d-text-caption)] text-fg-muted">
                {left === 0 ? t("setup.left.none") : plural("setup.left", left)}
              </span>
            </span>
            {/* R22.1. One control, and it collapses. A guide that can be shut
                for good while a church still has nine things to do is a guide
                a church loses on its first morning, and there is no screen
                left to ask for it back from. Putting it away for good belongs
                to the panel that says there is nothing left. */}
            <span className="-mr-1.5 flex shrink-0 items-center">
              <IconButton label={t("setup.shut")} variant="ghost" onClick={() => close(true)}>
                <PanelRightClose />
              </IconButton>
            </span>
          </div>

          {/* R22.1. A bar that moves. Twelve steps is a long way, and the thing
              that keeps somebody going is seeing the last press count for
              something rather than reading a number that changed. */}
          <div
            role="progressbar"
            aria-valuenow={settled}
            aria-valuemin={0}
            aria-valuemax={steps.length}
            aria-label={t("setup.soFar", {
              done: String(settled),
              all: String(steps.length),
            })}
            className="h-1.5 overflow-hidden rounded-full bg-sunken"
          >
            <span
              data-guide-bar
              className="block h-full rounded-full bg-primary"
              style={{ width: `${Math.round((settled / steps.length) * 100)}%` }}
            />
          </div>

          {complete ? (
            <div className="flex flex-col items-start gap-2 rounded-[12px] bg-primary-soft p-4">
              <span className="text-[14px] font-semibold text-fg">
                {t("setup.done.title", { name: church })}
              </span>
              <span className="text-[13px] leading-5 text-fg-muted">{t("setup.done.body")}</span>
              <Button variant="secondary" onClick={() => setAsking(true)}>
                {t("setup.putAway")}
              </Button>
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
      {card}
    </>
  );
}
