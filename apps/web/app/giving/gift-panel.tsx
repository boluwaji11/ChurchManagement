"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Banner, Button, Field, Input, Textarea,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectCreate,
  Sheet, SheetContent, SheetTrigger,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { MoneyInput } from "@/components/money-input";
import type { GiftMethod } from "@connectapp/db";
import { DateField } from "@/components/date-field";
import { Picker } from "@/components/picker";
import { useFormError } from "@/lib/form-error";
import { usePanelGuard } from "@/components/panel-guard";
import { toCents } from "@/lib/money";
import { addGift, findGiver, type GiverHit } from "./actions";

const METHODS: GiftMethod[] = ["cash", "cheque", "card", "ach", "in_kind", "other"];

/**
 * R13.12 to R13.14. One gift.
 *
 * The giver is optional, because an envelope with no name on it is still a
 * gift to a fund (R13.14), and the amount gives way to a description when what
 * was given was a piano rather than money (R13.13).
 */
export function GiftPanel({
  church,
  today,
  funds,
  batchId,
  trigger,
}: {
  church: string;
  today: string;
  funds: { id: string; name: string }[];
  /** Given when the gift is a line on a count. */
  batchId?: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = useFormError(open);
  const [saving, startTransition] = React.useTransition();

  const [giver, setGiver] = React.useState("");
  const [hits, setHits] = React.useState<GiverHit[]>([]);
  const [searching, setSearching] = React.useState(false);
  // An answer that arrives after a newer one was asked for is dropped.
  const ticket = React.useRef(0);
  const [fundId, setFundId] = React.useState(funds[0]?.id ?? "");
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState<GiftMethod>("cash");
  const [reference, setReference] = React.useState("");
  const [date, setDate] = React.useState(today);
  const [note, setNote] = React.useState("");
  const [inKind, setInKind] = React.useState("");

  const clear = () => {
    setGiver("");
    setAmount("");
    setReference("");
    setNote("");
    setInKind("");
    setMethod("cash");
    setDirty(false);
  };

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      clear();
      setDate(today);
    }
  };
  const { onOpenChange, guard } = usePanelGuard({ dirty, setOpen: close });

  const look = (query: string) => {
    if (query.trim().length < 2) {
      ticket.current++;
      setSearching(false);
      setHits([]);
      return;
    }
    const mine = ++ticket.current;
    setSearching(true);
    void findGiver(query, church).then((found) => {
      if (mine !== ticket.current) return;
      setSearching(false);
      setHits(found);
    });
  };

  /** R13.10. On a count, saving keeps the panel open for the next envelope. */
  const save = (again: boolean) => {
    const cents = method === "in_kind" ? 0 : toCents(amount);
    if (cents === null) {
      setError(t("gift.error.amount"));
      return;
    }

    startTransition(async () => {
      const result = await addGift(
        {
          memberId: giver || null,
          fundId,
          batchId: batchId ?? null,
          amountCents: cents,
          method,
          reference: reference || null,
          receivedOn: date,
          note: note || null,
          inKindDescription: inKind || null,
        },
        church,
      );
      setError(result.error);
      if (result.error) return;

      router.refresh();
      if (again) {
        clear();
        return;
      }
      setDirty(false);
      setOpen(false);
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="secondary"><Plus /> {t("giving.gift.add")}</Button>
        )}
      </SheetTrigger>

      <SheetContent
        title={t("giving.gift.add")}
        closeLabel={t("common.close")}
        footer={
          <>
            {batchId ? (
              <Button
                type="button"
                variant="secondary"
                disabled={saving || !dirty}
                onClick={() => save(true)}
              >
                {t("action.saveAndAdd")}
              </Button>
            ) : null}
            <Button
              type="button"
              disabled={saving || !dirty}
              loading={saving}
              onClick={() => save(false)}
            >
              {t("action.save")}
            </Button>
          </>
        }
      >
        {guard}

        <div className="flex flex-col gap-4">
          {error ? <Banner tone="danger" title={t("giving.failed")}>{error}</Banner> : null}

          {/* R13.14. Left empty, the gift is anonymous and still counts. */}
          <Field label={t("giving.gift.giver")}>
            <Picker
              name="memberId"
              defaultValue={null}
              options={hits.map((one) => ({ value: one.id, label: one.name }))}
              label={t("giving.gift.anonymous")}
              onChange={(id) => {
                setGiver(id);
                setDirty(true);
              }}
              onQuery={look}
              searching={searching}
            />
          </Field>

          <Field label={t("giving.gift.fund")} required>
            <Select
              value={fundId}
              onValueChange={(id) => {
                setFundId(id);
                setDirty(true);
              }}
            >
              <SelectTrigger aria-label={t("giving.gift.fund")}><SelectValue /></SelectTrigger>
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
              <Select
                value={method}
                onValueChange={(next) => {
                  setMethod(next as GiftMethod);
                  setDirty(true);
                }}
              >
                <SelectTrigger aria-label={t("giving.gift.method")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map((one) => (
                    <SelectItem key={one} value={one}>
                      {t(`giving.method.${one}` as never)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {method === "in_kind" ? (
              <Field label={t("giving.gift.inKind")} required>
                <Input
                  value={inKind}
                  onChange={(e) => {
                    setInKind(e.target.value);
                    setDirty(true);
                  }}
                  autoComplete="off"
                />
              </Field>
            ) : (
              <Field label={t("giving.gift.amount")} required>
                <MoneyInput
                  value={amount}
                  onChange={(next) => {
                    setAmount(next);
                    setDirty(true);
                  }}
                  placeholder="0.00"
                  autoComplete="off"
                  autoFocus
                />
              </Field>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("giving.gift.date")} required>
              <DateField
                name="receivedOn"
                defaultValue={date}
                onValueChange={(next) => {
                  setDate(next);
                  setDirty(true);
                }}
              />
            </Field>

            {method === "cheque" ? (
              <Field label={t("giving.gift.reference")}>
                <Input
                  value={reference}
                  onChange={(e) => {
                    setReference(e.target.value);
                    setDirty(true);
                  }}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </Field>
            ) : null}
          </div>

          <Field label={t("giving.gift.note")}>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setDirty(true);
              }}
            />
          </Field>
        </div>
      </SheetContent>
    </Sheet>
  );
}
