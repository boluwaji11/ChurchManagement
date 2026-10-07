"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Banner, Button, Card, CardTitle, Separator } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import type { ChurchStripeAccount } from "@connectapp/db";
import { connectStripe, refreshStripe } from "./actions";

/**
 * Stripe's own mark, so the card says who the account is with.
 *
 * Drawn rather than fetched: the CSP on this product allows no third-party
 * images, and a church reading this screen should see the name it is about to
 * create an account with rather than a generic card icon.
 */
function StripeMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-[18px]" fill="currentColor">
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305z" />
    </svg>
  );
}

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
          {/* Stripe's own blurple, which is how the company's mark reads. */}
          <span
            className="grid size-9 shrink-0 place-items-center rounded-[10px]"
            style={{ background: "#635BFF1a", color: "#635BFF" }}
          >
            <StripeMark />
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
