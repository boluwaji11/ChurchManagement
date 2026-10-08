"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft } from "lucide-react";
import {
  Button, Dialog, DialogContent, DialogFooter, IconButton,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R24.6. The button that commits a form, and the warning that it has not been.
 *
 * It listens to the form by id rather than sharing state with it, because the
 * two are often rendered as siblings by a server component with no client
 * parent between them to hold a context.
 *
 * Save stays dead until something has been touched, so a reader who opened a
 * record to look at it is not offered a save that would do nothing. Once
 * something has been touched, every way out of the form asks first, in the
 * product's own words.
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
  pending = false,
}: {
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
      <Button type="submit" form={form} disabled={!dirty || !full || working}>
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
          <p className="text-[length:var(--d-text-body)] text-fg">{t("unsaved.body")}</p>
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
 * Compared against the values it started with rather than flagged on the first
 * keystroke, so typing a space and taking it out again leaves Save dead. That
 * is the honest answer to "do I have unsaved work", and it is the one an undo
 * gives too.
 */
export function useDirty(form: string): boolean {
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    const element = document.getElementById(form);
    if (!(element instanceof HTMLFormElement)) return;

    let opened = snapshot(element);
    const compare = () => setDirty(snapshot(element) !== opened);

    /*
     * What was just saved becomes the new baseline.
     *
     * A form that stays on screen after saving would otherwise go dirty again
     * on the next keystroke, because the comparison was still against what the
     * page opened with rather than what was last committed.
     */
    const onSubmit = () => {
      opened = snapshot(element);
      setDirty(false);
    };

    element.addEventListener("submit", onSubmit);
    const stop = watch(element, compare);

    return () => {
      element.removeEventListener("submit", onSubmit);
      stop();
    };
  }, [form]);

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

    const element = document.getElementById(form);
    if (!(element instanceof HTMLFormElement)) return;

    const read = () => setFull(answered(element));
    read();
    return watch(element, read);
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
        <p className="text-[length:var(--d-text-body)] text-fg">{t("unsaved.body")}</p>

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
            {t("unsaved.leave")}
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
