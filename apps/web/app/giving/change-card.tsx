"use client";

import * as React from "react";
import { Banner, Button, Sheet, SheetContent } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Pay } from "@/app/give/[slug]/pay";
import { startCardChange } from "./actions";

/**
 * R13.3. A new card for a repeating gift, without leaving the product.
 *
 * Stripe's own fields, in Stripe's frame, inside this panel. The card number
 * goes from the browser to Stripe and never reaches this server, which is
 * what keeps every church on this product in PCI scope SAQ-A.
 */
export function ChangeCard({
  id,
  church,
  publishableKey,
}: {
  id: string;
  church: string;
  /** The platform's own key. It identifies, it does not authorise. */
  publishableKey: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [card, setCard] = React.useState<{ secret: string; accountId: string }>();
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
            const answer = await startCardChange(id, church);
            if (answer.error || !answer.secret || !answer.accountId) {
              setError(t("stripe.failed"));
              setOpen(true);
              return;
            }
            setError(undefined);
            setCard({ secret: answer.secret, accountId: answer.accountId });
            setOpen(true);
          })
        }
      >
        {t("give.card")}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent title={t("give.card")} closeLabel={t("common.close")} width="560px">
          {error ? (
            <Banner tone="danger" title={t("stripe.title")}>{error}</Banner>
          ) : card ? (
            <Pay
              publishableKey={publishableKey}
              accountId={card.accountId}
              secret={card.secret}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
