"use client";

import * as React from "react";
import { Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { manageMine } from "./actions";

/**
 * R13.3, R13.19. Change or stop a repeating gift from their own screens.
 *
 * Stripe's billing portal, where the card already lives. The member is signed
 * in here, so there is nothing to prove: the portal is opened for the customer
 * this church keeps for them.
 */
export function ManageMine({ church }: { church: string }) {
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  return (
    <>
      <Button
        variant="secondary"
        disabled={pending}
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await manageMine(church);
            if (result.error) {
              setError(t("stripe.failed"));
              return;
            }
            if (result.url) window.location.href = result.url;
          })
        }
      >
        {t("give.manage")}
      </Button>
      {error ? <p className="m-0 text-[13px] text-danger-text">{error}</p> : null}
    </>
  );
}
