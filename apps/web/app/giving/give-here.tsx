"use client";

import * as React from "react";
import { Button, Sheet, SheetContent } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { GiveForm } from "@/app/give/[slug]/give-form";

/**
 * R13.19, R17.4. Giving from the member's own screens.
 *
 * The same form the church's public page carries, in a panel rather than on a
 * page of its own: somebody already signed in came here to give, and sending
 * them out to a public page and back again is two navigations for one press.
 */
export function GiveHere({
  slug,
  church,
  funds,
  accountId,
  publishableKey,
  giver,
}: {
  slug: string;
  church: string;
  funds: { id: string; name: string; description: string | null }[];
  accountId: string;
  publishableKey: string;
  giver: { name: string; email: string };
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>{t("home.giveNow")}</Button>

      <Sheet open={open} onOpenChange={setOpen}>
        {/* Stripe draws a payment method list and a card form inside its own
            frame, and neither folds, so the panel gives them the room. */}
        <SheetContent
          title={t("give.title", { church })}
          closeLabel={t("common.close")}
          width="560px"
        >
          <GiveForm
            inside
            slug={slug}
            church={church}
            funds={funds}
            accountId={accountId}
            publishableKey={publishableKey}
            giver={giver}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
