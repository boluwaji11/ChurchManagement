"use client";

import * as React from "react";
import { Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { manageMine } from "./actions";

/**
 * R13.3. Change the card a repeating gift is collected on.
 *
 * Stripe's billing portal, where the card already lives. A card number never
 * enters a page this product draws, which is what keeps it out of PCI scope.
 * The member is signed in here, so the portal is opened for the customer this
 * church already keeps for them.
 */
export function ManageMine({ church }: { church: string }) {
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  return (
    <>
      <Button
        variant="ghost"
        className="h-auto min-h-0 p-0 text-[13px] font-medium"
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
        {t("give.card")}
      </Button>
      {error ? <p className="m-0 text-[13px] text-danger-text">{error}</p> : null}
    </>
  );
}
