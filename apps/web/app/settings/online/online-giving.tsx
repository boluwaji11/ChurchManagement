"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check, Copy, Download, ExternalLink, Link2, Loader2, Printer, QrCode, RefreshCw,
} from "lucide-react";
import { Banner, Button, Card } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import type { ChurchStripeAccount } from "@connectapp/db";
import { connectStripe, refreshStripe } from "./actions";

/**
 * Stripe's own mark, drawn rather than fetched.
 *
 * Nothing on this product loads a third party's image, and a church looking at
 * this card should see the name of the company it is about to hold an account
 * with rather than a generic card icon.
 */
function StripeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305z" />
    </svg>
  );
}

/** One step down the card, with the thread running between them. */
function Step({
  icon,
  title,
  done,
  last,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  /** R24.6. Green where the step is behind the church rather than ahead of it. */
  done?: boolean;
  last?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex w-6 shrink-0 flex-col items-center" aria-hidden>
        <span
          className="grid size-6 shrink-0 place-items-center rounded-full [&_svg]:size-3.5"
          style={
            done
              ? { background: "var(--hue-fern-tint)", color: "var(--hue-fern-key)" }
              : { background: "var(--color-sunken)", color: "var(--color-fg-subtle)" }
          }
        >
          {icon}
        </span>
        {last ? null : <span className="my-1 w-px flex-1 bg-line" />}
      </span>

      <div className={`flex min-w-0 flex-1 flex-col gap-2 ${last ? "" : "pb-5"}`}>
        <span className="text-[13px] font-medium text-fg-subtle">{title}</span>
        {children}
      </div>
    </li>
  );
}

/** The giving address, with the two things anybody does to it. */
function Address({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <div className="flex items-center gap-1 rounded-[var(--d-radius-control)] border border-line-strong bg-surface pr-1">
      <input
        readOnly
        value={value}
        aria-label={t("give.link")}
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-[13px] text-fg outline-none"
      />
      <button
        type="button"
        aria-label={copied ? t("joining.copied") : t("joining.copy")}
        title={copied ? t("joining.copied") : t("joining.copy")}
        onClick={() => {
          void navigator.clipboard?.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        }}
        className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-sunken hover:text-fg [&_svg]:size-4"
      >
        {copied ? <Check className="text-primary" /> : <Copy />}
      </button>
      <a
        href={value}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={t("stripe.open")}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-sunken hover:text-fg [&_svg]:size-4"
      >
        <ExternalLink />
      </a>
    </div>
  );
}

/**
 * R13.1, R13.6, R13.7. Taking a gift by card: the account, the address, the code.
 *
 * One card read top to bottom, because that is the order a church does it in:
 * connect Stripe, hand out the address, put the code on the bulletin. The
 * thread down the left says so, and a step that is behind them wears green.
 */
export function OnlineGiving({
  church,
  account,
  missing,
  configured,
  address,
  qr,
}: {
  church: string;
  account: ChurchStripeAccount | null;
  /** R13.1. What the church has not filled in, which Stripe will ask for. */
  missing: string[];
  /** Whether this platform has a Stripe key at all. */
  configured: boolean;
  /** The church's own giving address. */
  address: string;
  /** The same address as a code, where the account can take a gift. */
  qr: string | null;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const ready = Boolean(account?.chargesEnabled);
  const settling = Boolean(account && !account.chargesEnabled && account.detailsSubmitted);

  /*
   * R13.1. Stripe makes its mind up a moment after the church finishes its
   * form, so the screen waits with them rather than leaving a button.
   */
  React.useEffect(() => {
    if (!settling) return;
    let stop = false;

    const timer = window.setInterval(async () => {
      if (stop) return;
      const answer = await refreshStripe(church);
      if (!answer.error) router.refresh();
    }, 2500);
    const give = window.setTimeout(() => {
      stop = true;
      window.clearInterval(timer);
    }, 30_000);

    return () => {
      stop = true;
      window.clearInterval(timer);
      window.clearTimeout(give);
    };
  }, [settling, church, router]);

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

  return (
    <div className="flex max-w-[720px] flex-col gap-4">
      {error ? <Banner tone="danger" title={t("stripe.title")}>{error}</Banner> : null}
      {configured ? null : (
        <Banner tone="info" title={t("stripe.title")}>{t("stripe.unconfigured")}</Banner>
      )}

      <Card className="flex flex-col gap-5 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-[10px] text-white [&_svg]:size-[18px]"
            style={{ background: "#635BFF" }}
          >
            <StripeMark />
          </span>

          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-semibold text-fg">{t("stripe.title")}</span>
            {account ? (
              <span className="truncate font-mono text-[12px] text-fg-subtle">
                {account.accountId}
                {account.livemode ? "" : ` · ${t("stripe.test")}`}
              </span>
            ) : null}
          </span>

          {/* R24.6. Green when it is working, and it says which. */}
          <span
            className="flex h-[26px] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold"
            style={
              ready
                ? { background: "var(--hue-fern-tint)", color: "var(--hue-fern-key)" }
                : { background: "var(--color-sunken)", color: "var(--color-fg-muted)" }
            }
          >
            {settling ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            {!account
              ? t("stripe.state.none")
              : ready
                ? t("stripe.state.ready")
                : settling
                  ? t("stripe.state.settling")
                  : t("stripe.state.pending")}
          </span>
        </div>

        <ol className="m-0 flex list-none flex-col p-0">
          <Step icon={<StripeMark />} title={t("stripe.step.account")} done={ready}>
            {ready ? (
              <a
                href="https://dashboard.stripe.com/"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex w-fit items-center gap-1.5 font-medium text-primary no-underline"
              >
                <ExternalLink className="size-4" aria-hidden /> {t("stripe.open")}
              </a>
            ) : (
              <>
                {missing.length > 0 ? (
                  <div className="flex flex-col gap-1 text-[13px] text-fg-muted">
                    <span>{t("stripe.missing")}</span>
                    <ul className="m-0 flex list-disc flex-col pl-5">
                      {missing.map((one) => (
                        <li key={one}>{t(`stripe.missing.${one}` as never)}</li>
                      ))}
                    </ul>
                    <Link
                      href={`/settings/church?church=${church}`}
                      className="self-start font-medium text-primary"
                    >
                      {t("stripe.missing.go")}
                    </Link>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    disabled={pending || !configured || settling}
                    loading={pending || settling}
                    onClick={go}
                  >
                    {account ? t("stripe.continue") : t("stripe.connect")}
                  </Button>
                  {account && !settling ? (
                    <Button variant="secondary" disabled={pending} onClick={again}>
                      <RefreshCw /> {t("stripe.refresh")}
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </Step>

          <Step icon={<Link2 />} title={t("give.link")} done={ready}>
            {ready ? (
              <Address value={address} />
            ) : (
              <span className="text-[13px] text-fg-muted">{t("stripe.step.later")}</span>
            )}
          </Step>

          <Step icon={<QrCode />} title={t("give.qr.title")} done={ready} last>
            {ready && qr ? (
              <div className="flex flex-wrap items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qr}
                  alt=""
                  className="size-[104px] rounded-lg border border-line bg-white p-1.5"
                />
                <div className="flex flex-col gap-2">
                  <a
                    href={qr}
                    download={`${church}-giving-qr.png`}
                    className="inline-flex w-fit items-center gap-1.5 font-medium text-primary no-underline"
                  >
                    <Download className="size-4" aria-hidden /> {t("give.qr.download")}
                  </a>
                  <a
                    href={`/giving/qr?church=${church}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex w-fit items-center gap-1.5 font-medium text-primary no-underline"
                  >
                    <Printer className="size-4" aria-hidden /> {t("give.qr")}
                  </a>
                </div>
              </div>
            ) : (
              <span className="text-[13px] text-fg-muted">{t("stripe.step.later")}</span>
            )}
          </Step>
        </ol>
      </Card>

      <p className="m-0 text-[13px] text-fg-muted">{t("stripe.fees.body")}</p>
    </div>
  );
}
