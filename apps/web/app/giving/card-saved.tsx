"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dialog, DialogContent } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R13.3. What the giver reads when Stripe sends them back with a new card.
 *
 * The address says it happened, so the page says it once and takes the mark
 * out of the address on the way past: a refresh should not say it again.
 */
export function CardSaved() {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = React.useState(params.get("card") === "done");

  const close = () => {
    setOpen(false);
    const next = new URLSearchParams(params.toString());
    next.delete("card");
    router.replace(`/giving${next.size > 0 ? `?${next.toString()}` : ""}`);
  };

  return (
    <Dialog open={open} onOpenChange={(on) => (on ? null : close())}>
      <DialogContent title={t("give.card.saved")} closeLabel={t("common.close")}>
        <p className="m-0 text-[length:var(--d-text-body)] text-fg-muted">
          {t("give.card.savedBody")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
