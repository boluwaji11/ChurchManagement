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
  onConfirm: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent alert title={title}>
        {body ? (
          <p className="text-[length:var(--d-text-body)] text-fg-muted">{body}</p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            {keepLabel ?? t("action.cancel")}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={disabled}
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
