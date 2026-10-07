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
}: {
  church: string;
  account: ChurchStripeAccount | null;
  /** Whether this platform has a Stripe key at all. */
  configured: boolean;
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
        <p className="text-[length:var(--d-text-body)] text-fg-muted">{t("stripe.fees.body")}</p>
      </Card>
    </div>
  );
}
