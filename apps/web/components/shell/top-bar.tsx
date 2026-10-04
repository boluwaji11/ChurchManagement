import * as React from "react";
import { FlameMark } from "../brand";

/**
 * R24.6. The bar across the top of a page.
 *
 * 14px of padding with 24px at the sides, a hairline under it, the canvas
 * behind it, and 12px between its parts. The title is Fraunces at 20px over a
 * 24px line and takes the room that is left.
 *
 * On the right, the one action that belongs to this page. One, because a row of
 * six filled buttons tells a volunteer nothing about which to press. A page's
 * other actions live on the page, next to the thing they act on, and some
 * pages have no action at all.
 *
 * There is no search box here. Cmd+K opens the palette from anywhere, and a
 * box in the chrome of every screen earns its width on none of them.
 *
 * The mark appears here only on a phone, where there is no sidebar carrying it.
 */
export function TopBar({
  title,
  action,
  children,
}: {
  title: string;
  /** The one filled button for this page. */
  action?: React.ReactNode;
  /** Anything that sits between the title and the action. */
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-canvas px-6 py-3.5">
      <span className="md:hidden">
        <FlameMark size={28} />
      </span>
      <h1 className="min-w-0 flex-1 truncate font-display text-[20px] leading-6 text-fg">
        {title}
      </h1>
      {children}
      {/* The design's top-bar action is 36px rather than the 40px a button is
          everywhere else, so the one place it appears sets it here instead of
          thirty pages passing a height. */}
      {action ? (
        <div className="flex items-center gap-3 [&_a]:min-h-9 [&_button]:min-h-9">{action}</div>
      ) : null}
    </header>
  );
}
