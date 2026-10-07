"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check, CircleCheck, Copy, Download, ExternalLink, Landmark, Link2, Loader2, Printer,
  QrCode, RefreshCw,
} from "lucide-react";
import { Banner, Button, Card, Tooltip } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { StripeWordmark } from "@/components/stripe-wordmark";
import type { ChurchStripeAccount } from "@connectapp/db";
import type { AccountFace } from "./actions";
import { connectStripe, refreshStripe } from "./actions";
import { NonprofitRate } from "./nonprofit-rate";

/**
 * Stripe's own mark, drawn rather than fetched.
 *
 * Nothing on this product loads a third party's image, and a church looking at
 * this card should see the name of the company it is about to hold an account
 * with rather than a generic card icon.
 */
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

      <div className={`flex min-w-0 flex-1 flex-col gap-2.5 ${last ? "pb-1" : "pb-7"}`}>
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
      <Tooltip content={copied ? t("joining.copied") : t("joining.copy")}>
      <button
        type="button"
        aria-label={copied ? t("joining.copied") : t("joining.copy")}
        onClick={() => {
          void navigator.clipboard?.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        }}
        className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-muted hover:bg-sunken hover:text-fg [&_svg]:size-4"
      >
        {copied ? <Check className="text-primary" /> : <Copy />}
      </button>
      </Tooltip>
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
  face,
  signedInAs,
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
  /** R13.1. What Stripe holds that a church would recognise. */
  face: AccountFace;
  /** Whoever is reading this, to sign off the email to Stripe. */
  signedInAs: string;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const ready = Boolean(account?.chargesEnabled);

  /*
   * R13.1. Stripe addresses each account by its id, so this goes to the
   * church's own, rather than to whichever account the browser happens to be
   * signed in to. Somebody who is not on that account is asked to sign in,
   * which is Stripe's business and not ours.
   */
  const inStripe = account
    ? `https://dashboard.stripe.com/${account.accountId}${account.livemode ? "" : "/test"}`
    : "https://dashboard.stripe.com/";
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
    <div className="flex max-w-[1120px] flex-col gap-4">
      {/* R24.6. The account and the rate stand side by side and end level,
          because neither is a footnote to the other. */}
      <div className="grid items-stretch gap-5 xl:[grid-template-columns:minmax(0,1fr)_minmax(300px,380px)]">
      <div className="flex min-w-0 flex-col gap-4">
      {error ? <Banner tone="danger" title={t("stripe.title")}>{error}</Banner> : null}
      {configured ? null : (
        <Banner tone="info" title={t("stripe.title")}>{t("stripe.unconfigured")}</Banner>
      )}

      <Card className="flex h-full flex-col gap-6 p-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Stripe's own wordmark, white on their blurple, which is one of
              the three their brand rules allow. */}
          <span
            className="grid h-9 w-[76px] shrink-0 place-items-center rounded-[10px] px-2.5 text-white"
            style={{ background: "#635BFF" }}
          >
            <StripeWordmark className="h-4 w-full" />
          </span>

          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-semibold text-fg">
              {face.name || t("stripe.title")}
            </span>
            {account ? (
              <span className="truncate text-[12px] text-fg-subtle">
                {[
                  face.bank ? t("stripe.payingTo", { bank: face.bank }) : null,
                  face.payouts ? t(`stripe.payouts.${face.payouts}` as never) : null,
                  account.livemode ? null : t("stripe.test"),
                ]
                  .filter(Boolean)
                  .join(" · ")}
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
            {ready ? <CircleCheck className="size-3.5" aria-hidden /> : null}
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
          <Step icon={<Landmark />} title={t("stripe.step.account")} done={ready}>
            {ready ? (
              <div className="flex flex-col gap-1.5">
                <a
                  href={inStripe}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex w-fit items-center gap-1.5 font-medium text-primary no-underline"
                >
                  <ExternalLink className="size-4" aria-hidden /> {t("stripe.open")}
                </a>
                {/* The token Stripe's own support asks for, and nothing a
                    church needs to read otherwise. */}
                <span className="font-mono text-[11px] text-fg-subtle">
                  {t("stripe.account", { id: account!.accountId })}
                </span>
              </div>
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
              <div className="flex flex-wrap items-center gap-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qr}
                  alt=""
                  className="size-[150px] rounded-lg border border-line bg-white p-2"
                />
                <div className="flex flex-col gap-3">
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

      </div>

      {/* R13.1. Stripe charges a church less once it has asked, and it does
          not backdate the answer, so this sits beside the account from the
          moment there is one. */}
      {ready && account ? (
        <NonprofitRate
          church={face.name || church}
          accountId={account.accountId}
          signedInAs={signedInAs}
        />
      ) : null}
      </div>

      <p className="m-0 text-[13px] text-fg-muted">
        {t("stripe.fees.a")} <strong className="font-semibold text-fg underline underline-offset-4">
          {t("stripe.fees.takes")}
        </strong>{" "}
        {t("stripe.fees.b")}
      </p>
    </div>
  );
}
