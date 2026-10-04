"use client";

import * as React from "react";
import {
  Button, Dialog, DialogContent, DialogFooter,
} from "@hearth/ui";
import { t } from "@hearth/i18n";

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
export function FormActions({
  form,
  label,
}: {
  /** The id of the form this commits. */
  form: string;
  label: string;
}) {
  const dirty = useDirty(form);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="submit" form={form} disabled={!dirty}>
        {label}
      </Button>

      <LeaveGuard dirty={dirty} />
    </div>
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

    const opened = snapshot(element);
    const compare = () => setDirty(snapshot(element) !== opened);

    /*
     * Click as well as input: a pill or a switch writes its answer into a
     * hidden field, and setting a value from code fires no input event. The
     * form's listener runs before React's, which is attached at the root, so
     * the comparison waits a tick for the hidden field to catch up.
     */
    const later = () => setTimeout(compare, 0);

    element.addEventListener("input", compare);
    element.addEventListener("change", compare);
    element.addEventListener("click", later);
    element.addEventListener("submit", () => setDirty(false));

    return () => {
      element.removeEventListener("input", compare);
      element.removeEventListener("change", compare);
      element.removeEventListener("click", later);
    };
  }, [form]);

  return dirty;
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
