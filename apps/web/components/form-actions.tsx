"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft } from "lucide-react";
import {
  Button, Dialog, DialogContent, DialogFooter, IconButton,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/*
 * R24.6. The control that submits a form, and the unsaved-changes warning.
 *
 * These listen to the form by id rather than sharing state with it, because
 * the two are often rendered as siblings by a server component with no client
 * parent between them to hold a context.
 *
 * Save stays disabled until something has been changed, so a reader who opened
 * a record only to look at it is not offered a save that would do nothing.
 * Once something has been changed, every way out of the form confirms first.
 */

/**
 * R24.6. Which forms are busy, by id.
 *
 * A form's save button is not always rendered inside the component doing the
 * saving: the group pages put it in their header, beside the back link, while
 * the editor that submits lives further down the tree. A small registry lets
 * the one that knows tell the one that draws, without threading a prop through
 * a server component that cannot hold state.
 */
const busy = new Map<string, boolean>();
const watchers = new Set<() => void>();

export function setFormBusy(form: string, on: boolean): void {
  if ((busy.get(form) ?? false) === on) return;
  busy.set(form, on);
  for (const tell of watchers) tell();
}

/**
 * R24.6. How many times this form has settled against the server.
 *
 * Bumped once a save has come back, whichever way it went. `useDirty` reads it
 * and takes what is on screen as the new baseline, because what is on screen
 * after a save has settled is what the server holds: the new values where it
 * accepted them, the old ones where it refused.
 */
const settled = new Map<string, number>();
const settleWatchers = new Set<() => void>();

export function formSettled(form: string): void {
  settled.set(form, (settled.get(form) ?? 0) + 1);
  for (const tell of settleWatchers) tell();
}

function useSettled(form: string): number {
  return React.useSyncExternalStore(
    (tell) => {
      settleWatchers.add(tell);
      return () => settleWatchers.delete(tell);
    },
    () => settled.get(form) ?? 0,
    () => 0,
  );
}

function useFormBusy(form: string): boolean {
  return React.useSyncExternalStore(
    (tell) => {
      watchers.add(tell);
      return () => watchers.delete(tell);
    },
    () => busy.get(form) ?? false,
    () => false,
  );
}

/** Reports this form's busy state for as long as the component is on screen. */
export function useReportBusy(form: string, on: boolean): void {
  React.useEffect(() => {
    setFormBusy(form, on);
    return () => setFormBusy(form, false);
  }, [form, on]);
}

export function FormActions({
  form,
  label,
  guide,
  pending = false,
  disabled = false,
}: {
  /** R22.3. The name the setup guide points at this by, where it walks here. */
  guide?: string;
  /** The id of the form this commits. */
  form: string;
  label: string;
  /**
   * R24.6. Whether the save is in flight.
   *
   * A button that looks untouched for two seconds reads as a button that did
   * not work, and the next thing anybody does is press it again. While this is
   * true it says so and refuses a second press.
   */
  pending?: boolean;
  /** A form-specific rule that still needs to be satisfied. */
  disabled?: boolean;
}) {
  const dirty = useDirty(form);
  const full = useAnswered(form);
  // Both hooks run every render. Reading the registry on the right of a `||`
  // skipped the call whenever `pending` was already true, and a hook that is
  // sometimes called is a hook React refuses to line up.
  const registered = useFormBusy(form);
  const working = pending || registered;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button data-guide={guide} type="submit" form={form} disabled={!dirty || !full || working || disabled}>
        {working ? (
          <span
            aria-hidden
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
          />
        ) : null}
        {working ? t("action.saving") : label}
      </Button>

      <LeaveGuard dirty={dirty && !working} />
    </div>
  );
}

/**
 * R24.6. The way back out of an edit, for a card that edits in place.
 *
 * Those cards have no route of their own to go back to, so the arrow returns
 * the card to its reading state. With work unsaved it asks first, in the same
 * words a link out of the page would.
 */
export function BackToView({
  form,
  onBack,
  label,
}: {
  /** The id of the form being edited. */
  form: string;
  onBack: () => void;
  label?: string;
}) {
  const dirty = useDirty(form);
  const [asking, setAsking] = React.useState(false);

  return (
    <>
      <IconButton
        label={label ?? t("action.back")}
        variant="ghost"
        onClick={() => (dirty ? setAsking(true) : onBack())}
      >
        <ArrowLeft />
      </IconButton>

      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent alert title={t("unsaved.title")} closeLabel={t("common.close")}>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAsking(false)}>
              {t("unsaved.stay")}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                setAsking(false);
                onBack();
              }}
            >
              {t("unsaved.discard")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Every named value in the form, as one comparable string. */
function snapshot(form: HTMLFormElement): string {
  const out: string[] = [];
  for (const [key, value] of new FormData(form).entries()) {
    out.push(`${key}=${typeof value === "string" ? value : value.name}`);
  }
  // Sorted, because a field that re-renders can change the order without
  // changing a single answer.
  return out.sort().join("\u0000");
}

/**
 * Whether this form says anything different from what it opened with.
 *
 * Compared against the values it opened with rather than set on the first
 * keystroke, so typing a space and removing it again leaves Save disabled.
 * That is also the correct answer after an undo.
 */
export function useDirty(form: string): boolean {
  const [dirty, setDirty] = React.useState(false);
  const settledCount = useSettled(form);

  React.useEffect(() => {
    /*
     * R24.6. Waits for the form.
     *
     * A window reads this from outside the panel its form is drawn in, and the
     * panel's content is attached a commit later than the window itself, so
     * looking once found nothing and the window went on believing there was
     * never anything unsaved in it: the close square left without asking.
     */
    let looking = 0;
    let stopWatching: (() => void) | null = null;
    let frames: number[] = [];

    const attach = () => {
      const element = document.getElementById(form);
      if (!(element instanceof HTMLFormElement)) {
        /* A handful of frames, which covers a panel that mounts its content
           after it mounts itself, and gives up rather than spinning. */
        if (looking++ > 20) return;
        frames.push(requestAnimationFrame(attach));
        return;
      }
      start(element);
    };

    const start = (element: HTMLFormElement) => {
    let opened = snapshot(element);
    const compare = () => setDirty(snapshot(element) !== opened);

    /*
     * What was just saved becomes the new baseline, so a form that stays on
     * screen does not go dirty again on the next keystroke.
     */
    const onSubmit = () => {
      opened = snapshot(element);
      setDirty(false);
    };

    /*
     * R24.6. And once the save has settled, the baseline is read again.
     *
     * Taking it on submit alone assumed the save worked. A refused one left
     * the baseline holding the value the server would not take, the form
     * reverted to the value it did hold, and Save stayed lit over a form that
     * differed from nothing. What is on screen after a save settles is what
     * the server holds, either way, so that is the honest baseline.
     */
    /*
     * Two frames, the same wait the watcher uses. The reading has to happen
     * after React has put the server's answer into the DOM, and a save that
     * was refused reverts its fields a frame after the action returns.
     */
    let first = 0;
    let second = 0;
    first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        opened = snapshot(element);
        setDirty(false);
      });
    });

    element.addEventListener("submit", onSubmit);
    const stop = watch(element, compare);
    frames.push(first, second);

    stopWatching = () => {
      element.removeEventListener("submit", onSubmit);
      stop();
    };
    };

    attach();

    return () => {
      for (const frame of frames) cancelAnimationFrame(frame);
      frames = [];
      stopWatching?.();
    };
  }, [form, settledCount]);

  return dirty;
}

/**
 * Calls back whenever anything in this form could have changed.
 *
 * Listened for on the document rather than on the form. A date picker, a
 * combobox and a select all draw their panel in a portal at the end of the
 * body, so the press that chooses an answer happens outside the form and never
 * bubbles to it. Watching the document catches those, and the reading is still
 * taken from the form, so nothing outside it can count.
 */
function watch(element: HTMLFormElement, read: () => void): () => void {
  const frames = new Set<number>();
  const later = () => {
    /*
     * Two frames, because the answer is written into a hidden field by React
     * and setting a value from code fires no event at all. One frame is the
     * state update, the second is the commit that puts the value in the DOM.
     */
    frames.add(requestAnimationFrame(() => frames.add(requestAnimationFrame(read))));
  };

  document.addEventListener("input", later);
  document.addEventListener("change", later);
  document.addEventListener("click", later);
  document.addEventListener("keyup", later);

  return () => {
    for (const frame of frames) cancelAnimationFrame(frame);
    document.removeEventListener("input", later);
    document.removeEventListener("change", later);
    document.removeEventListener("click", later);
    document.removeEventListener("keyup", later);
  };
}

/** Whether every field in this form that draws an asterisk holds an answer. */
function answered(form: HTMLFormElement): boolean {
  for (const field of Array.from(form.querySelectorAll("[data-required]"))) {
    const controls = Array.from(
      field.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "input, select, textarea",
      ),
    ).filter((control) => !control.disabled);
    // A field with nothing to read, such as one drawn entirely from state or
    // one nobody on this screen may answer, is left to the server. A guess
    // here would be a Save nobody can press.
    if (controls.length === 0) continue;

    let given = false;
    for (const control of controls) {
      if (control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")) {
        if (control.checked) given = true;
      } else if (control.value.trim() !== "") {
        given = true;
      }
    }
    if (!given) return false;
  }
  return true;
}

/**
 * Whether this form has everything it refuses to be saved without.
 *
 * Read from the asterisks, the same mark the reader is looking at. The server
 * still refuses a blank, and that refusal is now somewhere nobody arrives:
 * pressing Save and being told to fill in the name is a worse way to learn it
 * than a button that waits.
 */
export function useAnswered(form: string, open: boolean = true): boolean {
  const [full, setFull] = React.useState(true);

  React.useEffect(() => {
    // A panel's form is in the document only while the panel is open, so the
    // reading is taken again each time one is opened.
    if (!open) return;

    /*
     * A panel's form arrives a frame or two after the press that opened it,
     * because the content is drawn into a portal at the end of the body. A
     * single lookup here found nothing and left the press enabled over an
     * empty form, so the lookup keeps trying until the form is there.
     */
    let stop: (() => void) | undefined;
    let frame = 0;
    const find = () => {
      const element = document.getElementById(form);
      if (element instanceof HTMLFormElement) {
        const read = () => setFull(answered(element));
        read();
        stop = watch(element, read);
        return;
      }
      frame = requestAnimationFrame(find);
    };
    find();

    return () => {
      cancelAnimationFrame(frame);
      stop?.();
    };
  }, [form, open]);

  return full;
}

/**
 * R24.6. Asks before unsaved work is walked away from.
 *
 * A link inside the product never reaches the browser, so the click is caught
 * here and answered with a box of our own. The browser's own prompt is left
 * alone: it cannot be styled, it cannot be worded, and showing it alongside
 * this one asks the same question twice in two different voices.
 */
export function LeaveGuard({ dirty }: { dirty: boolean }) {
  const [leaving, setLeaving] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!dirty) return;

    const catchLink = (event: MouseEvent) => {
      // A modified click is the reader opening a second tab, which leaves this
      // one exactly where it is.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const link = (event.target as HTMLElement | null)?.closest?.("a");
      const href = link?.getAttribute("href");
      if (!link || !href || link.target === "_blank") return;
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      const next = new URL(href, window.location.origin);
      if (next.origin !== window.location.origin) return;
      if (next.pathname === window.location.pathname) return;

      event.preventDefault();
      setLeaving(next.pathname + next.search);
    };

    document.addEventListener("click", catchLink, true);
    return () => document.removeEventListener("click", catchLink, true);
  }, [dirty]);

  return (
    <Dialog
      open={leaving !== null}
      onOpenChange={(next) => (next ? null : setLeaving(null))}
    >
      <DialogContent alert title={t("unsaved.title")} closeLabel={t("common.close")}>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setLeaving(null)}>
            {t("unsaved.stay")}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              const to = leaving;
              setLeaving(null);
              if (to) window.location.href = to;
            }}
          >
            {t("unsaved.discard")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * R24.6. Tells the registry when the form it sits in is submitting.
 *
 * For a form that posts straight to a server action with no transition of its
 * own. Rendered inside the form, where `useFormStatus` can see it, and drawing
 * nothing. The save button can then say it is working from wherever on the page
 * it happens to live.
 */
export function FormBusy({ form }: { form: string }) {
  const { pending } = useFormStatus();
  useReportBusy(form, pending);
  return null;
}
