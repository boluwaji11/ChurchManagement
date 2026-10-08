"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import {
  Banner, Button, Dialog, DialogContent, DialogFooter, Field, IconButton, Input,
  Sheet, SheetContent, SheetTrigger,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectCreate,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { DateField } from "@/components/date-field";
import { useFormError } from "@/lib/form-error";
import { usePanelGuard } from "@/components/panel-guard";
import { toCents } from "@/lib/money";
import { MoneyInput } from "@/components/money-input";
import { startCount, amendCount, removeCount } from "./actions";

/**
 * R13.10. Opening a count.
 *
 * The declared total is asked for before a single line is entered, because a
 * total typed after the entry is a total that agrees with the entry. That is
 * the whole of the control.
 */
export function StartCount({
  church,
  today,
  funds,
  count,
  trigger,
}: {
  church: string;
  today: string;
  /** R13.9. The causes the money can go to, so a session says which. */
  funds: { id: string; name: string }[];
  /**
   * R13.10. The session being put right, where one is. Somebody counts
   * wrong, or names the wrong day, and the row they pressed opens here
   * holding what it holds.
   */
  count?: {
    id: string;
    name: string;
    receivedOn: string;
    fundId: string;
    method: string;
    amount: string;
  };
  /** What opens it. The Start button where there is none. */
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = useFormError(open);
  const [name, setName] = React.useState(count?.name ?? "");
  const [date, setDate] = React.useState(count?.receivedOn ?? today);
  const [fundId, setFundId] = React.useState(count?.fundId ?? funds[0]?.id ?? "");
  /* R13.12. Cash or cheques: the two things a session is counting. */
  const [method, setMethod] = React.useState<"cash" | "cheque">(
    count?.method === "cheque" ? "cheque" : "cash",
  );
  const [amount, setAmount] = React.useState(count?.amount ?? "");
  const [asking, setAsking] = React.useState(false);
  const [saving, startTransition] = React.useTransition();

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      /*
       * Back to what it opened on: blank for a new session, and the
       * session's own values where one is being put right, so reopening a
       * row after a change of mind shows the row as it stands.
       */
      setDirty(false);
      setName(count?.name ?? "");
      setAmount(count?.amount ?? "");
      setFundId(count?.fundId ?? funds[0]?.id ?? "");
      setMethod(count?.method === "cheque" ? "cheque" : "cash");
      setDate(count?.receivedOn ?? today);
    }
  };
  const { onOpenChange, guard } = usePanelGuard({ dirty, setOpen: close });

  const save = () => {
    const cents = toCents(amount);
    if (cents === null || cents <= 0) {
      setError(t("gift.error.amount"));
      return;
    }
    startTransition(async () => {
      const input = { name, receivedOn: date, fundId, amountCents: cents, method } as const;
      const result = count
        ? await amendCount(count.id, input, church)
        : await startCount(input, church);
      setError(result.error);
      if (!result.error) {
        /*
         * R13.10. The session and what was counted are written together, so
         * the panel closes onto the list rather than carrying the reader
         * into a screen with one line on it.
         */
        close(false);
        router.refresh();
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {trigger ?? <Button><Plus /> {t("giving.count.start")}</Button>}
      </SheetTrigger>

      <SheetContent
        title={count ? t("giving.count.editTitle", { name: count.name }) : t("giving.count.start")}
        closeLabel={t("common.close")}
        footer={
          <>
            {/* R13.10. Counted twice, or named the wrong day. What it held
                goes with it. */}
            {count ? (
              <IconButton
                label={t("giving.count.remove")}
                variant="ghost"
                className="mr-auto"
                disabled={saving}
                onClick={() => setAsking(true)}
              >
                <Trash2 />
              </IconButton>
            ) : null}
            <Button
              type="button"
              disabled={saving || !dirty || !name.trim() || !date || !fundId || !amount.trim()}
              loading={saving}
              onClick={save}
            >
              {t("action.save")}
            </Button>
          </>
        }
      >
        {guard}

        <div className="flex flex-col gap-4">
          {error ? <Banner tone="danger" title={t("giving.failed")}>{error}</Banner> : null}

          <Field label={t("giving.count.name")} required>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
              }}
              placeholder={t("giving.count.namePlaceholder")}
              autoComplete="off"
              autoFocus
            />
          </Field>

          <Field label={t("giving.count.date")} required>
            <DateField
              name="receivedOn"
              defaultValue={date}
              onValueChange={(next) => {
                setDate(next);
                setDirty(true);
              }}
            />
          </Field>

          {/* R13.9. Which fund it was given to, because "we counted
              $10,000" cannot tell a board what went to the building. */}
          <Field label={t("giving.gift.fund")} required>
            <Select
              value={fundId}
              onValueChange={(next) => {
                setFundId(next);
                setDirty(true);
              }}
            >
              <SelectTrigger aria-label={t("giving.gift.fund")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                create={
                  <SelectCreate href={`/settings/funds?church=${church}`}>
                    {t("fund.add")}
                  </SelectCreate>
                }
              >
                {funds.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>{fund.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("giving.gift.method")} required>
              <Select value={method} onValueChange={(next) => {
                setMethod(next as "cash" | "cheque");
                setDirty(true);
              }}>
                <SelectTrigger aria-label={t("giving.gift.method")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t("giving.method.cash")}</SelectItem>
                  <SelectItem value="cheque">{t("giving.method.cheque")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label={t("giving.count.counted")} required>
            <MoneyInput
              value={amount}
              onChange={(next) => {
                setAmount(next);
                setDirty(true);
              }}
              placeholder="0.00"
              autoComplete="off"
            />
            </Field>
          </div>
        </div>
      </SheetContent>

      {/* R13.10. Taking a session off the record takes what it held. */}
      <Dialog open={asking} onOpenChange={(on) => (on ? null : setAsking(false))}>
        <DialogContent alert title={t("giving.count.removeTitle", { name: count?.name ?? "" })}>
          <p className="m-0 text-[length:var(--d-text-body)] text-fg-muted">
            {t("giving.count.removeBody")}
          </p>
          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => setAsking(false)}>
              {t("action.cancel")}
            </Button>
            <Button
              variant="danger"
              disabled={saving}
              loading={saving}
              onClick={() =>
                startTransition(async () => {
                  const result = await removeCount(count!.id, church);
                  setError(result.error);
                  if (!result.error) {
                    setAsking(false);
                    close(false);
                    router.refresh();
                  }
                })
              }
            >
              {t("giving.count.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
