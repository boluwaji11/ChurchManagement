import * as React from "react";
import { t } from "@connectapp/i18n";
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
  under,
  children,
  footer,
  step,
  art,
  width = "max-w-[500px]",
}: {
  title: string;
  /** A line under the heading, where the screen has one. */
  under?: React.ReactNode;
  children: React.ReactNode;
  /** What sits below the card: the other way in, or the station. */
  footer?: React.ReactNode;
  /** Which of the three steps of starting a church this screen is. */
  step?: 1 | 2 | 3;
  /** Drawings for the margins, as the website places them. */
  art?: readonly Piece[];
  width?: string;
}) {
  return (
    <div data-theme="light" className="site-wash flex min-h-dvh flex-col">
      <SiteBar />

      <main
        id="main"
        className="relative grid flex-1 justify-items-center px-6 pb-14 pt-8 sm:pt-10"
      >
        {art ? <Art pieces={art} /> : null}

        <div className={cn("relative flex w-full flex-col gap-7", width)}>
          <div className="flex flex-col items-center gap-3 text-center">
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
 * R22.1. The three steps of starting a church, and which one this is.
 *
 * Somebody filling in a sign-up form wants to know how many more there are. The
 * steps behind this one are filled, the one ahead is a hairline.
 */
export function AuthSteps({ at }: { at: 1 | 2 | 3 }) {
  const labels = [t("auth.step.account"), t("auth.step.church"), t("auth.step.setup")];

  return (
    <ol className="flex list-none items-start gap-0 p-0">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = n < at;
        const here = n === at;
        return (
          <li key={label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="flex w-full items-center">
              <span
                className={cn("h-0.5 flex-1 rounded-full", i === 0 ? "bg-transparent" : done || here ? "bg-primary" : "bg-stone-300")}
              />
              <span
                aria-hidden
                className={cn(
                  "mx-1 size-3 shrink-0 rounded-full",
                  here ? "bg-primary ring-4 ring-primary/20" : done ? "bg-primary" : "bg-stone-300",
                )}
              />
              <span
                className={cn(
                  "h-0.5 flex-1 rounded-full",
                  i === labels.length - 1 ? "bg-transparent" : done ? "bg-primary" : "bg-stone-300",
                )}
              />
            </span>
            <span
              className={cn(
                "text-center text-[13px]",
                here ? "font-semibold text-fg" : "text-fg-subtle",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** The fields on these screens stand taller than the ones inside the app. */
export const AUTH_INPUT = "min-h-[52px] rounded-xl text-[16px]";
export const AUTH_BUTTON = "min-h-[52px] rounded-xl text-[16px]";
