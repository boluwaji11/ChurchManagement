import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { t } from "@connectapp/i18n";
import { Stages } from "@/components/stages";
import { cn } from "@connectapp/ui";
import { SiteBar, SiteFooter } from "@/components/site/chrome";
import { Art, type Piece } from "@/components/site/art";

/**
 * R1.7, R17.1. The screens somebody signs in, signs up, or starts a church on.
 *
 * Built to the redesign: the mark and the name above a centred display heading,
 * then one card holding the fields, then whatever else there is to say under
 * it. The card is 36px inside with 22px between its rows and the fields stand
 * 56px tall, because this is a page with one job on it and the one job should
 * be the size of the page.
 *
 * It sits near the top of the window rather than in the middle. Centred, a
 * short form floated in a field of nothing and a long one ran off the bottom.
 *
 * The heading is a page title rather than a hero, so it sits just above the
 * wordmark in size. A 40px headline over a 26px mark read as the heading being
 * the brand.
 */
export function AuthShell({
  title,
  mark,
  under,
  children,
  footer,
  step,
  art,
  bar,
  back,
  width = "max-w-[500px]",
}: {
  title: string;
  /** R1.1. The church's mark, on a screen that belongs to one church. */
  mark?: React.ReactNode;
  /** A line under the heading, where the screen has one. */
  under?: React.ReactNode;
  children: React.ReactNode;
  /** What sits below the card: the other way in, or the station. */
  footer?: React.ReactNode;
  /** Which of the three steps of starting a church this screen is. */
  step?: 1 | 2;
  /** Drawings for the margins, as the website places them. */
  art?: readonly Piece[];
  /** Who is signed in, on the right of the bar where a product puts it. */
  bar?: React.ReactNode;
  /** R24.6. The way back, as a mark at the top left. */
  back?: { href: string; label: string };
  width?: string;
}) {
  return (
    <div className="site-wash flex min-h-dvh flex-col">
      <SiteBar>{bar}</SiteBar>

      <main
        id="main"
        className="relative grid flex-1 justify-items-center px-6 pb-14 pt-8 sm:pt-10"
      >
        {art ? <Art pieces={art} /> : null}

        {/* R24.6. The way back where a back is: the top left of the page,
            rather than beside a heading that happens to be centred. */}
        {back ? (
          <Link
            href={back.href}
            aria-label={back.label}
            className="absolute left-6 top-8 grid size-9 place-items-center rounded-full text-fg-muted no-underline hover:bg-sunken hover:text-fg sm:top-10 [&_svg]:size-[18px]"
          >
            <ArrowLeft aria-hidden />
          </Link>
        ) : null}

        <div className={cn("relative flex w-full flex-col gap-7", width)}>
          <div className="flex flex-col items-center gap-3 text-center">
            {/* R1.1. The church's own mark over its own door, so somebody
                arriving knows whose it is before they read the heading. */}
            {mark}
            <h1 className="font-display text-[26px] leading-8 text-fg sm:text-[30px] sm:leading-9">
              {title}
            </h1>
            {under ? <p className="text-[16px] leading-6 text-fg-muted">{under}</p> : null}
          </div>

          {step ? <AuthSteps at={step} /> : null}

          <div
            data-density="portal"
            className="flex flex-col gap-5 rounded-[20px] border border-line bg-surface p-7 sm:p-9"
          >
            {children}
          </div>

          {footer ? (
            <div className="text-center text-[length:var(--d-text-body)] text-fg-muted">
              {footer}
            </div>
          ) : null}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

/**
 * R22.1. The two steps of starting a church, and which one this is.
 *
 * Somebody filling in a sign-up form wants to know how many more there are. The
 * steps behind this one are filled, the one ahead is a hairline. There were
 * three while setting up was a screen of its own; the second one now ends in
 * the product, with the guide beside it.
 */
export function AuthSteps({ at }: { at: 1 | 2 }) {
  return (
    <Stages labels={[t("auth.step.account"), t("auth.step.church")]} at={at} />
  );
}

/** The fields on these screens stand taller than the ones inside the app. */
