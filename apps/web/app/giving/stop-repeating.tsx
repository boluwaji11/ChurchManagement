"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banner, Button, Dialog, DialogContent, DialogFooter } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { stopRepeating } from "./actions";

/**
 * R13.3, R13.19. Stopping a repeating gift, without leaving the product.
 *
 * Stripe is told to cancel the subscription behind it. Changing the card
 * still happens at Stripe, because a card number never enters a page this
 * product draws.
 */
export function StopRepeating({
  id,
  church,
  label,
}: {
  id: string;
  church: string;
  /** What this gift is, so the confirmation names it. */
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {t("give.stop")}
      </Button>

      <Dialog open={open} onOpenChange={(on) => (on ? null : setOpen(false))}>
        <DialogContent title={t("give.stop.title", { gift: label })} closeLabel={t("common.close")}>
          <div className="flex flex-col gap-4">
            {error ? <Banner tone="danger" title={t("giving.failed")}>{error}</Banner> : null}
            <p className="m-0 text-[length:var(--d-text-body)] text-fg-muted">
              {t("give.stop.body")}
            </p>
          </div>

          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await stopRepeating(id, church);
                  setError(result.error);
                  if (!result.error) {
                    setOpen(false);
                    router.refresh();
                  }
                })
              }
            >
              {t("give.stop")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
