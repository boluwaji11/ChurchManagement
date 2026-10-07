"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CreditCard, ExternalLink, RefreshCw } from "lucide-react";
import { Banner, Button, Card, CardTitle, Separator } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import type { ChurchStripeAccount } from "@connectapp/db";
import { connectStripe, refreshStripe } from "./actions";

/**
 * R13.1. The church's own Stripe account, and what it costs.
 *
 * Said plainly, because this is the screen where a church decides whether to
 * believe the product: the gifts go to the church's account, ConnectApp takes
 * nothing, and Stripe's fee is Stripe's, at whatever rate the church is given.
 */
export function OnlineGiving({
  church,
  account,
  configured,
  origin,
}: {
  church: string;
  account: ChurchStripeAccount | null;
  /** Whether this platform has a Stripe key at all. */
  configured: boolean;
  /** Where this church is reached, for the address it hands its congregation. */
  origin: string;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const go = () =>
    startTransition(async () => {
      const result = await connectStripe(church);
      if (result.error) {
        setError(result.error === "stripe.unconfigured" ? t("stripe.unconfigured") : result.error);
        return;
      }
      if (result.url) window.location.href = result.url;
    });

  const again = () =>
    startTransition(async () => {
      const result = await refreshStripe(church);
      setError(result.error);
      if (!result.error) router.refresh();
    });

  const state = !account
    ? t("stripe.state.none")
    : account.chargesEnabled
      ? t("stripe.state.ready")
      : t("stripe.state.pending");

  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      {error ? (
        <div className="lg:col-span-2">
          <Banner tone="danger" title={t("stripe.title")}>{error}</Banner>
        </div>
      ) : null}

      {configured ? null : (
        <div className="lg:col-span-2">
          <Banner tone="info" title={t("stripe.title")}>{t("stripe.unconfigured")}</Banner>
        </div>
      )}

      <Card className="flex h-full flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary-soft text-primary [&_svg]:size-[18px]">
            <CreditCard />
          </span>
          <CardTitle>{t("stripe.title")}</CardTitle>
        </div>
        <Separator />

        <div className="flex flex-col gap-1">
          <span className="text-[length:var(--d-text-body)] font-medium text-fg">{state}</span>
          {account ? (
            <span className="font-mono text-[12px] text-fg-subtle">
              {t("stripe.account", { id: account.accountId })}
              {account.livemode ? "" : ` · ${t("stripe.test")}`}
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2">
          <Button disabled={pending || !configured} loading={pending} onClick={go}>
            {account ? t("stripe.continue") : t("stripe.connect")}
          </Button>
          {account ? (
            <>
              <Button variant="secondary" disabled={pending} onClick={again}>
                <RefreshCw /> {t("stripe.refresh")}
              </Button>
              <a
                href="https://dashboard.stripe.com/"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 px-2 font-medium text-primary no-underline"
              >
                <ExternalLink className="size-4" aria-hidden /> {t("stripe.open")}
              </a>
            </>
          ) : null}
        </div>
      </Card>

      <Card className="flex h-full flex-col gap-4">
        <CardTitle>{t("stripe.fees.title")}</CardTitle>
        <Separator />
        <p className="m-0 text-[length:var(--d-text-body)] text-fg-muted">
          {t("stripe.fees.body")}
        </p>

        {/* R13.6. The address the church puts behind "Give" on its own site,
            which only exists once Stripe will take a payment on the account. */}
        {account?.chargesEnabled ? (
          <div className="mt-auto flex flex-col gap-1.5">
            <span className="text-label text-fg">{t("give.link")}</span>
            <div className="flex items-center gap-1 rounded-[var(--d-radius-control)] border border-line-strong bg-surface pr-1">
              <input
                readOnly
                value={`${origin}/give/${church}`}
                aria-label={t("give.link")}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-[13px] text-fg outline-none"
              />
              <a
                href={`${origin}/give/${church}`}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={t("stripe.open")}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-sunken hover:text-fg [&_svg]:size-4"
              >
                <ExternalLink />
              </a>
            </div>

            {/* R13.7. The same address for the foyer and the bulletin. */}
            <a
              href={`/giving/qr?church=${church}`}
              target="_blank"
              rel="noreferrer noopener"
              className="self-start font-medium text-primary no-underline"
            >
              {t("give.qr")}
            </a>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
