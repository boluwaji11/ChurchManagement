"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import {
  Banner, Button, Card, Checkbox, Field, Input,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { money, toCents } from "@/lib/money";
import { withFee } from "@/lib/stripe-fee";
import { startGift } from "./actions";

/** The amounts a church's givers reach for first. */
const QUICK = [2_000, 5_000, 10_000, 25_000];

/**
 * R13.5, R13.6. One question, answered on a phone in a car park.
 *
 * Amount first, because that is what the giver came to decide. Fee coverage is
 * offered with the figure spelled out and is never ticked for them.
 */
export function GiveForm({
  slug,
  church,
  funds,
}: {
  slug: string;
  church: string;
  funds: { id: string; name: string; description: string | null }[];
}) {
  const [amount, setAmount] = React.useState("");
  const [fundId, setFundId] = React.useState(funds[0]?.id ?? "");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [cover, setCover] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const cents = toCents(amount) ?? 0;
  const fee = cents > 0 ? withFee(cents) - cents : 0;
  const charged = cover ? cents + fee : cents;

  const give = () => {
    if (cents <= 0) {
      setError(t("give.error.amount"));
      return;
    }
    startTransition(async () => {
      const result = await startGift({
        slug, fundId, amountCents: cents, coverFee: cover, name, email,
      });
      if (result.error) {
        setError(
          result.error.startsWith("give.") || result.error.startsWith("stripe.")
            ? t(result.error as never)
            : result.error,
        );
        return;
      }
      if (result.url) window.location.href = result.url;
    });
  };

  return (
    <Card className="flex flex-col gap-5">
      {error ? <Banner tone="danger" title={t("give.title", { church })}>{error}</Banner> : null}

      <Field label={t("give.amount")} required>
        <div className="flex flex-col gap-2.5">
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className="h-14 text-[24px]"
            autoComplete="off"
            autoFocus
          />
          <div className="flex flex-wrap gap-2">
            {QUICK.map((one) => (
              <button
                key={one}
                type="button"
                onClick={() => setAmount((one / 100).toFixed(0))}
                className="cursor-pointer rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-[13px] font-medium text-fg hover:bg-sunken"
              >
                {money(one).replace(/\.00$/, "")}
              </button>
            ))}
          </div>
        </div>
      </Field>

      <Field label={t("give.fund")} required>
        <Select value={fundId} onValueChange={setFundId}>
          <SelectTrigger aria-label={t("give.fund")}><SelectValue /></SelectTrigger>
          <SelectContent>
            {funds.map((fund) => (
              <SelectItem key={fund.id} value={fund.id}>{fund.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("give.name")}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </Field>
        <Field label={t("give.email")} required>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            inputMode="email"
            autoComplete="email"
          />
        </Field>
      </div>

      {/* R13.5. Offered with the figure, never ticked for them. */}
      {cents > 0 ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-sunken px-3 py-2.5 text-[length:var(--d-text-body)] text-fg">
          <Checkbox checked={cover} onCheckedChange={(on) => setCover(on === true)} />
          <span>{t("give.cover", { amount: money(fee), church })}</span>
        </label>
      ) : null}

      <Button
        className="h-12"
        disabled={pending || cents <= 0}
        loading={pending}
        onClick={give}
      >
        {t("give.submit", { amount: money(charged) })}
      </Button>

      <p className="m-0 flex items-center justify-center gap-1.5 text-[13px] text-fg-muted">
        <Lock className="size-3.5" aria-hidden /> {t("give.secure")}
      </p>
    </Card>
  );
}
