"use client";

import * as React from "react";
import { Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { subscribeAgain } from "./actions";

/**
 * HRT-143, R16.8. The press that undoes the press.
 *
 * An unsubscribe link is followed by accident often enough that the way back
 * belongs on the screen that took them off, while they are still looking at
 * it. Afterwards the screen says so and the button goes, because pressing it
 * twice would mean nothing.
 */
export function WayBack({
  token,
  church,
}: {
  token: string;
  church: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const [back, setBack] = React.useState(false);

  if (back) {
    return (
      <div className="flex flex-col gap-1">
        <p className="m-0 font-medium text-fg">{t("wayOut.backDone")}</p>
        <p className="m-0 text-fg-muted">{t("wayOut.backBody", { church })}</p>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      className="self-start px-0 text-primary underline underline-offset-4"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void subscribeAgain(token).then((ok) => {
          setBack(ok);
          setBusy(false);
        });
      }}
    >
      {t("wayOut.back")}
    </Button>
  );
}
