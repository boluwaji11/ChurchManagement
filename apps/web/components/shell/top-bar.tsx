import * as React from "react";
import { Mark } from "../brand";
import { Help } from "../help";

/**
 * R24.6. The bar across the top of a page.
 *
 * The page's title, and the one action that belongs to this page. One, because
 * a row of six filled buttons tells a volunteer nothing about which to press.
 * A page's other actions live on the page, next to the thing they act on.
 *
 * The mark appears here only on a phone, where there is no sidebar carrying it.
 */
export function TopBar({
  title,
  action,
  children,
}: {
  title: string;
  /** The one filled button for this page. Some pages have none. */
  action?: React.ReactNode;
  /** Anything that sits between the title and the action. */
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-canvas px-4 py-3.5 sm:px-6">
      <Mark className="text-[1.1rem] md:hidden" />
      <h1 className="min-w-0 flex-1 truncate font-display text-title text-fg sm:text-heading">
        {title}
      </h1>
      {children}
      {/* R22.2. In reach from every screen, and quiet until it is asked. */}
      <Help />
      {action}
    </header>
  );
}
