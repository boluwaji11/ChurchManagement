"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Banner, Button, Field, Input, Sheet, SheetContent, SheetTrigger,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { DateField } from "@/components/date-field";
import { useFormError } from "@/lib/form-error";
import { usePanelGuard } from "@/components/panel-guard";
import { toCents } from "@/lib/money";
import { MoneyInput } from "@/components/money-input";
import { startCount } from "./actions";

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
}: {
  church: string;
  today: string;
  /** R13.9. What the money can be given to, so a session says which. */
  funds: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = useFormError(open);
  const [name, setName] = React.useState("");
  const [date, setDate] = React.useState(today);
  const [fundId, setFundId] = React.useState(funds[0]?.id ?? "");
  const [amount, setAmount] = React.useState("");
  const [saving, startTransition] = React.useTransition();

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setDirty(false);
      setName("");
      setAmount("");
      setFundId(funds[0]?.id ?? "");
      setDate(today);
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
      const result = await startCount(
        { name, receivedOn: date, fundId, amountCents: cents },
        church,
      );
      setError(result.error);
      if (!result.error) {
        /*
         * R13.10. The session and what was counted are written together, so
         * the panel closes onto the list rather than carrying the reader
         * into a screen with one line on it.
         */
        setDirty(false);
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button><Plus /> {t("giving.count.start")}</Button>
      </SheetTrigger>

      <SheetContent
        title={t("giving.count.start")}
        closeLabel={t("common.close")}
        footer={
          <Button
            type="button"
            disabled={saving || !dirty || !name.trim() || !date || !fundId || !amount.trim()}
            loading={saving}
            onClick={save}
          >
            {t("action.save")}
          </Button>
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
              <SelectContent create={`/settings/funds?church=${church}`}>
                {funds.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>{fund.name}</SelectItem>
                ))}
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
      </SheetContent>
    </Sheet>
  );
}
