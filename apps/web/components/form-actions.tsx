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
 * something has been touched, leaving the page asks first: the browser's own
 * prompt for a reload or a closed tab, and ours for a link inside the product,
 * which the browser never sees.
 */
export function FormActions({
  form,
  label,
  onCancel,
  cancelLabel,
}: {
  /** The id of the form this commits. */
  form: string;
  label: string;
  /** Given where cancelling is a thing this screen can do in place. */
  onCancel?: () => void;
  cancelLabel?: string;
}) {
  const dirty = useDirty(form);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {onCancel ? (
        <Button type="button" variant="secondary" onClick={onCancel}>
          {cancelLabel ?? t("action.cancel")}
        </Button>
      ) : null}

      <Button type="submit" form={form} disabled={!dirty}>
        {label}
      </Button>

      <LeaveGuard dirty={dirty} />
    </div>
  );
}

/** Whether anything in this form has been touched since it was rendered. */
export function useDirty(form: string): boolean {
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    const element = document.getElementById(form);
    if (!element) return;

    const touched = () => setDirty(true);
    element.addEventListener("input", touched);
    element.addEventListener("change", touched);
    // A submit is the point of the form, so it stops being unsaved work.
    element.addEventListener("submit", () => setDirty(false));

    return () => {
      element.removeEventListener("input", touched);
      element.removeEventListener("change", touched);
    };
  }, [form]);

  return dirty;
}

/**
 * R24.6. Asks before unsaved work is walked away from.
 *
 * Two paths out of a page, and the browser only knows about one of them. A
 * reload or a closed tab gets the browser's own prompt. A link inside the
 * product never reaches the browser, so the click is caught here and answered
 * with a box of our own.
 */
export function LeaveGuard({ dirty }: { dirty: boolean }) {
  const [leaving, setLeaving] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!dirty) return;

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Required by Chrome, which ignores the string and shows its own words.
      event.returnValue = "";
    };

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

    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", catchLink, true);

    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", catchLink, true);
    };
  }, [dirty]);

  return (
    <Dialog open={leaving !== null} onOpenChange={(open) => (open ? null : setLeaving(null))}>
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
