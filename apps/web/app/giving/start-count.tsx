"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Banner, Button, Field, Input, Sheet, SheetContent, SheetTrigger,
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
export function StartCount({ church, today }: { church: string; today: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = useFormError(open);
  const [name, setName] = React.useState("");
  const [date, setDate] = React.useState(today);
  const [expected, setExpected] = React.useState("");
  const [saving, startTransition] = React.useTransition();

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setDirty(false);
      setName("");
      setExpected("");
      setDate(today);
    }
  };
  const { onOpenChange, guard } = usePanelGuard({ dirty, setOpen: close });

  const save = () => {
    const cents = toCents(expected);
    if (cents === null) {
      setError(t("gift.error.amount"));
      return;
    }
    startTransition(async () => {
      const result = await startCount(
        { name, receivedOn: date, expectedCents: cents },
        church,
      );
      setError(result.error);
      if (!result.error) {
        setDirty(false);
        setOpen(false);
        if (result.id) router.push(`/giving/counts/${result.id}?church=${church}`);
        else router.refresh();
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
          <Button type="button" disabled={saving || !dirty} loading={saving} onClick={save}>
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

          <Field label={t("giving.count.expected")} required>
            <MoneyInput
              value={expected}
              onChange={(next) => {
                setExpected(next);
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
