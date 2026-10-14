"use client";

import * as React from "react";
import { Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { subscribeAgain } from "./actions";

/**
 * HRT-143, R16.8. What the screen says, and the press that changes it.
 *
 * An unsubscribe link is followed by accident often enough that the way back
 * belongs here, while the person is still looking at the screen that took them
 * off. Pressing it replaces what the screen says rather than adding to it:
 * leaving "you have been unsubscribed" above "you have been resubscribed"
 * leaves somebody unsure which of the two is true.
 */
export function WayOut({
  token,
  church,
  address,
}: {
  token: string;
  church: string;
  address: string | null;
}) {
  const [busy, setBusy] = React.useState(false);
  const [back, setBack] = React.useState(false);

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-[24px] leading-8 text-fg">
          {back ? t("wayOut.backDone") : t("wayOut.title")}
        </h1>
        <p className="m-0 text-fg-muted">
          {back
            ? t("wayOut.backBody", { church })
            : address
              ? t("wayOut.body", { address, church })
              : t("wayOut.bodyPlain", { church })}
        </p>
      </div>

      {back ? null : (
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
      )}
    </>
  );
}
