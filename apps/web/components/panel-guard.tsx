"use client";

import * as React from "react";
import {
  Button, Dialog, DialogContent, DialogFooter,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R24.6. A panel with unsaved work does not close on one press.
 *
 * Save stays off until something has actually changed, so the button says
 * whether there is anything to save, and closing a panel that has been typed in
 * asks first. The question is ours rather than the browser's: a native
 * beforeunload prompt is drawn by the operating system, in its own words.
 *
 * Returns the handler a `Sheet` or `Dialog` passes to `onOpenChange`, plus the
 * dialog that asks. Mount `guard` inside the panel.
 */
export function usePanelGuard({
  dirty,
  setOpen,
}: {
  /** Whether anything in the panel has been changed since it opened. */
  dirty: boolean;
  setOpen: (open: boolean) => void;
}) {
  const [asking, setAsking] = React.useState(false);

  const onOpenChange = (next: boolean) => {
    if (!next && dirty) {
      setAsking(true);
      return;
    }
    setOpen(next);
  };

  const guard = (
    <Dialog open={asking} onOpenChange={setAsking}>
      <DialogContent alert title={t("unsaved.title")} closeLabel={t("common.close")}>
        <DialogFooter>
          <Button type="button" variant="ghost" data-dismiss onClick={() => setAsking(false)}>
            {t("unsaved.stay")}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              setAsking(false);
              setOpen(false);
            }}
          >
            {t("unsaved.discard")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { onOpenChange, guard };
}
