"use client";

import * as React from "react";
import { ArrowLeft, Lock } from "lucide-react";
import {
  Banner, Button, Card, Checkbox, Field, Input,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { currencyMark, groupAmount, money, toCents } from "@/lib/money";
import { withFee } from "@/lib/stripe-fee";
import { startGift } from "./actions";
import { REPEATS, type Repeat } from "./repeats";
import { Pay } from "./pay";

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
  accountId,
  publishableKey,
  giver,
}: {
  slug: string;
  church: string;
  funds: { id: string; name: string; description: string | null }[];
  /** R13.2. The church's own account, which the payment is made on. */
  accountId: string;
  publishableKey: string;
  /** R13.6. What we already know, where the giver is signed in. */
  giver: { name: string; email: string };
}) {
  const [amount, setAmount] = React.useState("");
  const [fundId, setFundId] = React.useState(funds[0]?.id ?? "");
  const [name, setName] = React.useState(giver.name);
  const [email, setEmail] = React.useState(giver.email);
  const [cover, setCover] = React.useState(false);
  /** R13.4. What each fund takes, where the giver has split it. */
  const [split, setSplit] = React.useState<Record<string, string>>({});
  const [splitting, setSplitting] = React.useState(false);
  /* R13.3. Weekly leads, because that is the rhythm a church gathers on. */
  const [repeat, setRepeat] = React.useState<Repeat>("week");
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();
  /** R13.6. Stripe's fields, once the giver has said what they are giving. */
  const [secret, setSecret] = React.useState<string>();

  const cents = toCents(amount) ?? 0;
  const shares = Object.entries(split)
    .map(([id, typed]) => ({ fundId: id, cents: toCents(typed) ?? 0 }))
    .filter((one) => one.cents > 0);
  const placed = shares.reduce((sum, one) => sum + one.cents, 0);
  const left = cents - placed;
  const fee = cents > 0 ? withFee(cents) - cents : 0;
  const charged = cover ? cents + fee : cents;

  const give = () => {
    if (cents <= 0) {
      setError(t("give.error.amount"));
      return;
    }
    startTransition(async () => {
      const result = await startGift({
        slug,
        fundId,
        split: splitting ? shares : undefined,
        amountCents: cents,
        coverFee: cover,
        name,
        email,
        repeat,
      });
      if (result.error) {
        setError(
          result.error.startsWith("give.") || result.error.startsWith("stripe.")
            ? t(result.error as never)
            : result.error,
        );
        return;
      }
      if (result.secret) {
        setSecret(result.secret);
        return;
      }
      // A browser Stripe cannot draw its frame in still has their own page.
      if (result.url) window.location.href = result.url;
    });
  };

  /*
   * R13.6. Once Stripe has the gift, the form gives way to its fields rather
   * than sitting above them: two amounts on one screen is two questions.
   */
  if (secret) {
    return (
      <Card className="flex flex-col gap-4 p-6">
        <button
          type="button"
          onClick={() => setSecret(undefined)}
          className="flex w-fit cursor-pointer items-center gap-1.5 font-medium text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden /> {t("give.change")}
        </button>

        <Pay publishableKey={publishableKey} accountId={accountId} secret={secret} />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-5 p-6 pt-7">
      {/* R24.9. What went wrong, with a way to put it away. */}
      {error ? (
        <Banner
          tone="danger"
          title={t("give.failed")}
          onClose={() => setError(undefined)}
          closeLabel={t("common.close")}
        >
          {error}
        </Banner>
      ) : null}

      <Field label={t("give.amount")} required>
        <div className="flex flex-col gap-2.5">
          {/* R13.6. The currency is part of the question, so it sits with
              the number rather than being remembered. The field grows to what
              is typed, which keeps the pair centred. */}
          <div className="flex h-14 items-center justify-center gap-0.5 rounded-[var(--d-radius-control)] border border-line bg-surface shadow-sm focus-within:border-fg-subtle">
            <span className="text-[26px] text-fg-subtle">{currencyMark()}</span>
            <input
              value={amount}
              onChange={(e) => setAmount(groupAmount(e.target.value))}
              inputMode="decimal"
              placeholder="0.00"
              aria-label={t("give.amount")}
              autoComplete="off"
              autoFocus
              className="min-w-[4ch] max-w-full bg-transparent text-[26px] text-fg outline-none [field-sizing:content] placeholder:text-fg-subtle"
            />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {QUICK.map((one) => (
              <button
                key={one}
                type="button"
                onClick={() => setAmount(groupAmount(String(one / 100)))}
                className="cursor-pointer rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] font-medium text-fg hover:bg-sunken"
              >
                {money(one).replace(/\.00$/, "")}
              </button>
            ))}
          </div>
        </div>
      </Field>

      {/* R13.3. How often. Five of its own, the way the amounts above it are
          drawn, and the one in force is filled so it reads at a glance. */}
      <div className="flex flex-wrap justify-center gap-2 rounded-[var(--d-radius-control)] border border-line bg-surface p-2.5 shadow-sm">
        {REPEATS.map((one) => {
          const chosen = repeat === one;

          return (
            <button
              key={one}
              type="button"
              onClick={() => setRepeat(one)}
              aria-pressed={chosen}
              className={[
                "cursor-pointer rounded-full border px-4 py-2",
                "text-[13px] font-medium whitespace-nowrap",
                chosen
                  ? "border-primary bg-primary text-primary-fg"
                  : "border-transparent bg-sunken text-fg hover:bg-line",
              ].join(" ")}
            >
              {t(`give.repeat.${one}` as never)}
            </button>
          );
        })}
      </div>

      {/* R13.4. One fund, or the gift divided between several. */}
      {splitting ? (
        <Field label={t("give.fund")} required>
          <div className="flex flex-col gap-2.5 rounded-[var(--d-radius-control)] border border-line bg-surface p-3 shadow-sm">
            {funds.map((fund) => (
              <span key={fund.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[length:var(--d-text-body)] text-fg">
                  {fund.name}
                </span>
                <Input
                  className="w-[120px] border-line"
                  value={split[fund.id] ?? ""}
                  onChange={(e) =>
                    setSplit((was) => ({ ...was, [fund.id]: e.target.value }))
                  }
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-label={fund.name}
                />
              </span>
            ))}
            {/* Over the gift is a mistake to put right, so it says so in the
                colour this product says that in. */}
            <span
              className={`text-center text-[13px] italic ${
                left < 0 ? "text-danger-text" : "text-fg-muted"
              }`}
            >
              {left >= 0
                ? t("give.split.left", { amount: money(left) })
                : t("give.split.over", { amount: money(-left) })}
            </span>
          </div>
        </Field>
      ) : (
        <Field label={t("give.fund")} required>
          <Select value={fundId} onValueChange={setFundId}>
            <SelectTrigger aria-label={t("give.fund")} className="border-line">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {funds.map((fund) => (
                <SelectItem key={fund.id} value={fund.id}>{fund.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {funds.length > 1 ? (
        <button
          type="button"
          onClick={() => {
            setSplitting((was) => !was);
            setSplit({});
          }}
          className="-mt-2 cursor-pointer self-center font-medium text-primary underline underline-offset-4"
        >
          {splitting ? t("give.split.single") : t("give.split")}
        </button>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("give.name")}>
          <Input
            className="border-line"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </Field>
        <Field label={t("give.email")} required>
          <Input
            className="border-line"
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
        disabled={pending || cents <= 0 || (splitting && (left !== 0 || shares.length < 2))}
        loading={pending}
        onClick={give}
      >
        {repeat === "once"
          ? t("give.submit", { amount: money(charged) })
          : t(`give.submit.${repeat}` as never, { amount: money(charged) })}
      </Button>

      <p className="m-0 flex flex-wrap items-center justify-center gap-1.5 text-[13px] text-fg-muted">
        <Lock className="size-3.5" aria-hidden />
        {t("give.secure")}
        <a
          href="https://stripe.com/docs/security"
          target="_blank"
          rel="noreferrer noopener"
          className="font-medium text-primary"
        >
          {t("give.secure.more")}
        </a>
      </p>
    </Card>
  );
}
