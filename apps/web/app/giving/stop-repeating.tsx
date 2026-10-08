"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleSlash } from "lucide-react";
import {
  Banner, Button, Dialog, DialogContent, DialogFooter, IconButton,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { useFormError } from "@/lib/form-error";
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
  who,
}: {
  id: string;
  church: string;
  /** What this gift is, so the confirmation names it. */
  label: string;
  /** Whose it is, where somebody else is stopping it. */
  who?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = useFormError(open);
  const [pending, startTransition] = React.useTransition();

  return (
    <>
      {/* R24.x. One of two actions on every repeating gift, so both are
          the icon alone and the tooltip carries the words. */}
      <IconButton
        label={t("give.stop")}
        className="text-danger-text hover:bg-danger-soft"
        onClick={() => setOpen(true)}
      >
        <CircleSlash />
      </IconButton>

      <Dialog open={open} onOpenChange={(on) => (on ? null : setOpen(false))}>
        <DialogContent
          title={
            who
              ? t("give.stop.titleWho", { name: who, gift: label })
              : t("give.stop.title", { gift: label })
          }
          closeLabel={t("common.close")}
        >
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
