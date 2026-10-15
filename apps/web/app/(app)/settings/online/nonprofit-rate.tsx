"use client";

import * as React from "react";
import { BadgePercent, Check, Copy, ExternalLink, Mail } from "lucide-react";
import { Button, Card } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/** Where a church asks Stripe for the rate. */
const STRIPE_NONPROFIT = "nonprofit@stripe.com";
const STRIPE_HELP =
  "https://support.stripe.com/questions/fee-discount-for-nonprofit-organizations";

/**
 * R13.1. The money a church leaves on the table by not asking.
 *
 * Stripe charges a registered 501(c)(3) less, and it does not backdate the
 * discount, so a church that finds out in June has paid the full rate since
 * January. It is three lines in an email, so the product writes the email.
 *
 * Nothing is sent from here. The church's own mail client opens with the
 * words in it, and the church presses send.
 */
export function NonprofitRate({
  church,
  accountId,
  signedInAs,
}: {
  church: string;
  accountId: string;
  /** Whoever is reading this, to sign it off. */
  signedInAs: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const subject = t("stripe.rate.subject", { church });
  const body = t("stripe.rate.message", { church, id: accountId, name: signedInAs });

  const mail =
    `mailto:${STRIPE_NONPROFIT}`
    + `?subject=${encodeURIComponent(subject)}`
    + `&body=${encodeURIComponent(body)}`;

  return (
    <Card className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-center gap-2.5">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-[10px] [&_svg]:size-[18px]"
          style={{ background: "var(--hue-fern-tint)", color: "var(--hue-fern-key)" }}
        >
          <BadgePercent />
        </span>
        <span className="font-semibold text-fg">{t("stripe.rate.title")}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="m-0 text-[length:var(--d-text-body)] text-fg-muted">
          {t("stripe.rate.body")}
        </p>
        <p className="m-0 text-[length:var(--d-text-body)] font-medium text-fg">
          {t("stripe.rate.saved")}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-fg-subtle">{t("stripe.rate.needs")}</span>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {["ein", "email", "volume"].map((one) => (
            <li key={one} className="flex gap-2 text-[13px] text-fg">
              <Check
                className="mt-0.5 size-3.5 shrink-0"
                style={{ color: "var(--hue-fern-key)" }}
                aria-hidden
              />
              {t(`stripe.rate.need.${one}` as never)}
            </li>
          ))}
        </ul>
      </div>

      <p className="m-0 text-[13px] text-fg-muted">{t("stripe.rate.late")}</p>

      <div className="mt-auto flex flex-wrap items-center gap-2">
        <Button asChild>
          <a href={mail}>
            <Mail /> {t("stripe.rate.draft")}
          </a>
        </Button>

        <Button
          variant="secondary"
          onClick={() => {
            void navigator.clipboard?.writeText(`${subject}\n\n${body}`);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? t("stripe.rate.copied") : t("stripe.rate.copy")}
        </Button>
      </div>

      <a
        href={STRIPE_HELP}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-primary no-underline"
      >
        <ExternalLink className="size-3.5" aria-hidden /> {t("stripe.rate.read")}
      </a>
    </Card>
  );
}
