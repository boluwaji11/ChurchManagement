import * as React from "react";
import { Flame } from "lucide-react";

/**
 * R1.7, R17.1. The screen somebody signs in or signs up on.
 *
 * Built to the redesign: the mark on its own above a centred display heading,
 * then one card holding the fields, then whatever else there is to say under
 * it. The card is 36px inside with 22px between its rows and the fields stand
 * 56px tall, because this is a page with one job on it and the one job should
 * be the size of the page.
 */
export function AuthShell({
  title,
  under,
  children,
  footer,
  width = "max-w-[500px]",
}: {
  title: string;
  /** A line under the heading, where the screen has one. */
  under?: React.ReactNode;
  children: React.ReactNode;
  /** What sits below the card: the other way in, or the station. */
  footer?: React.ReactNode;
  width?: string;
}) {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-canvas px-6 py-12">
      <div className={`flex w-full ${width} flex-col gap-7`}>
        <div className="flex flex-col items-center gap-3 text-center">
          {/* The mark at the size the design draws it on this screen: 64px,
              on its own, above the heading. */}
          <span
            aria-hidden
            className="grid size-16 place-items-center rounded-[18px] bg-ember-500 text-white"
          >
            <Flame className="size-8" />
          </span>
          <h1 className="mt-3 font-display text-[36px] leading-[42px] text-fg sm:text-[44px] sm:leading-[50px]">
            {title}
          </h1>
          {under ? <p className="text-[17px] text-fg-muted">{under}</p> : null}
        </div>

        <div className="flex flex-col gap-5 rounded-[20px] border border-line bg-surface p-7 sm:p-9">
          {children}
        </div>

        {footer ? (
          <div className="text-center text-[length:var(--d-text-body)] text-fg-muted">
            {footer}
          </div>
        ) : null}
      </div>
    </main>
  );
}

/** The fields on these screens stand taller than the ones inside the app. */
export const AUTH_INPUT = "min-h-[52px] rounded-xl text-[16px]";
export const AUTH_BUTTON = "min-h-[52px] rounded-xl text-[16px]";
