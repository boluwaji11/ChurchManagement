"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import {
  Banner, Button, Dialog, DialogContent, DialogFooter, Field, IconButton,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { groupAmount, money, toCents } from "@/lib/money";
import { MoneyInput } from "@/components/money-input";
import { useFormError } from "@/lib/form-error";
import { giveBack } from "./actions";

/**
 * R13.15. Giving a gift back.
 *
 * Part of it or all of it, because a giver who meant $50 and typed $500 wants
 * $450 back. Stripe sends an online gift back the way it came, to the card or
 * to the bank account. A cash gift is written down here and handed over by the
 * church.
 */
export function RefundGift({
  church,
  gift,
}: {
  church: string;
  gift: {
    id: string;
    amountCents: number;
    refundedCents: number;
    method: string;
    /** R13.14. Who gave it, where anybody is on it. */
    giver?: string | null;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [error, setError] = useFormError(open);
  const [pending, startTransition] = React.useTransition();

  const left = gift.amountCents - gift.refundedCents;

  React.useEffect(() => {
    if (open) setAmount(groupAmount((left / 100).toFixed(2)));
  }, [open, left]);

  return (
    <>
      <IconButton
        label={t("giving.gift.refund")}
        variant="ghost"
        onClick={() => setOpen(true)}
      >
        <Undo2 />
      </IconButton>

      <Dialog open={open} onOpenChange={(on) => (on ? null : setOpen(false))}>
        <DialogContent
          title={t("giving.gift.refundTitle", { amount: money(toCents(amount) ?? 0) })}
          closeLabel={t("common.close")}
        >
          <div className="flex flex-col gap-4">
            {error ? <Banner tone="danger" title={t("giving.failed")}>{error}</Banner> : null}

            <Field label={t("giving.gift.amount")} required>
              <MoneyInput value={amount} onChange={setAmount} autoFocus />
            </Field>

            <p className="m-0 text-[13px] text-fg-muted">
              {/* R13.14. The giver by name where the gift carries one. An
                  anonymous gift has nobody to name, so it stays "they". */}
              {gift.method === "card"
                ? gift.giver
                  ? t("giving.gift.refundCard.named", { name: gift.giver })
                  : t("giving.gift.refundCard")
                : gift.method === "ach"
                  ? gift.giver
                    ? t("giving.gift.refundBank.named", { name: gift.giver })
                    : t("giving.gift.refundBank")
                  : t("giving.gift.refundCash")}
            </p>
          </div>

          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button
              variant="danger"
              disabled={pending || !amount.trim()}
              loading={pending}
              onClick={() => {
                const cents = toCents(amount);
                if (cents === null || cents <= 0) {
                  setError(t("gift.error.amount"));
                  return;
                }
                startTransition(async () => {
                  const result = await giveBack(gift.id, cents, church);
                  setError(result.error);
                  if (!result.error) {
                    setOpen(false);
                    router.refresh();
                  }
                });
              }}
            >
              {t("giving.gift.refund")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
