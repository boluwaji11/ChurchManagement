"use client";

import * as React from "react";
import { Button, Dialog, DialogContent, DialogFooter } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { usePush } from "../portal/installed";

/** Asked once a browser, and the answer is kept here rather than on the church. */
const ASKED = "connectapp.push.asked";

/**
 * R16.10, R17.11, R22.1. Asking once whether this browser should be told.
 *
 * The browser's own prompt appears by the padlock with no explanation of what
 * it is for, and a browser only offers it once: somebody who dismisses it has
 * dismissed it for good. So the question is asked in the product's own words
 * first, and the browser is only asked once somebody has said yes.
 *
 * Asked on the first visit to the signed-in product and never again, whichever
 * way it is answered. Afterwards it is a preference, on the profile screen,
 * beside how the product is drawn.
 */
export function AskPush({ church }: { church: string }) {
  const push = usePush(church);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!push || push.on) return;
    /* Somebody who has already answered the browser has answered. */
    if (typeof Notification !== "undefined" && Notification.permission !== "default") return;
    try {
      if (window.localStorage.getItem(ASKED)) return;
    } catch {
      // A browser with storage switched off is asked each session rather than
      // never, which is the kinder way round.
    }
    setOpen(true);
  }, [push, push?.on]);

  const answered = () => {
    try {
      window.localStorage.setItem(ASKED, "1");
    } catch {
      // Nothing to keep it in. The question comes back next session.
    }
    setOpen(false);
  };

  if (!push) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) answered(); }}>
      <DialogContent title={t("push.ask.title")} closeLabel={t("common.close")}>
        <DialogFooter>
          <Button variant="secondary" onClick={answered}>{t("push.ask.no")}</Button>
          <Button
            loading={push.busy}
            onClick={() => { push.toggle(); answered(); }}
          >
            {t("push.ask.yes")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
