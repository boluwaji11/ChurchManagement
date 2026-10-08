"use client";

import * as React from "react";
import {
  Button, Dialog, DialogTrigger, DialogContent, DialogFooter,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R24.x. Asking before something comes off a list.
 *
 * Anything that takes a row out of a list opens this first: a list is scanned
 * quickly, the control sits under the thumb, and the row is gone before the
 * eye catches up. The one sentence it carries is the exception to the rule
 * against explanatory copy, because it says what happens.
 */
export function Confirm({
  trigger,
  title,
  body,
  confirmLabel,
  keepLabel,
  disabled,
  onConfirm,
}: {
  /** The control that opens it, usually the x or the bin on the row. */
  trigger: React.ReactNode;
  title: string;
  /** What happens, in one sentence, where the title does not say it. */
  body?: string;
  confirmLabel: string;
  /** The way out. Defaults to Cancel. */
  keepLabel?: string;
  disabled?: boolean;
  /**
   * What to do when they say yes.
   *
   * Hand back what the work returns and the box stays open with its button
   * busy until it lands, which is the only way a confirmation can obey the
   * rule that the control which started the work shows it. Return nothing
   * and the box closes on the press, as it always did.
   */
  onConfirm: () => void | Promise<unknown>;
}) {
  const [open, setOpen] = React.useState(false);
  const [working, setWorking] = React.useState(false);

  const say = () => {
    const answer = onConfirm();
    if (!(answer instanceof Promise)) {
      setOpen(false);
      return;
    }

    setWorking(true);
    void answer.finally(() => {
      setWorking(false);
      setOpen(false);
    });
  };

  return (
    /* While the work runs the box stays put: pressing outside it or the
       cross would leave the reader looking at a list that has not changed
       yet, wondering whether they stopped it. */
    <Dialog open={open} onOpenChange={(on) => (working ? null : setOpen(on))}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent alert title={title}>
        {body ? (
          <p className="text-[length:var(--d-text-body)] text-fg-muted">{body}</p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={working}
            onClick={() => setOpen(false)}
          >
            {keepLabel ?? t("action.cancel")}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={disabled}
            loading={working}
            onClick={say}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
