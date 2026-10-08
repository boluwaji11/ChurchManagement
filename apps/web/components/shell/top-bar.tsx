import * as React from "react";
import { FlameMark } from "../brand";

/**
 * R24.6. The bar across the top of a page.
 *
 * 14px of padding with 24px at the sides, a hairline under it, the canvas
 * behind it, and 12px between its parts. The page's own name is Fraunces at 28px
 * over a 34px line and takes the room that is left. It is set larger than a
 * heading on the page under it, so the screen somebody is on reads louder than
 * a block within it.
 *
 * On the right, the one action that belongs to this page. One, because a row of
 * six filled buttons tells a volunteer nothing about which to press. A page's
 * The screen's one action is not here: it sits with the screen, at the top of
 * its content. Beside the bell it read as another piece of product chrome, and
 * the thing a page is for should not.
 *
 * There is no search box here. Cmd+K opens the palette from anywhere, and a
 * box in the chrome of every screen earns its width on none of them.
 *
 * The mark appears here only on a phone, where there is no sidebar carrying it.
 */
export function TopBar({
  title,
  bell,
  logoUrl,
  churchName,
  children,
}: {
  /**
   * The page's name. Some screens name themselves on the page itself, with the
   * person's or the group's own name, and those pass none.
   */
  title?: string;
  /** R24.6. The notification bell, which every screen carries. */
  bell?: React.ReactNode;
  /** R1.1. This church's own logo, where it has uploaded one. */
  logoUrl?: string | null;
  /** R1.1. Whose church this is, for the letter shown until there is a logo. */
  churchName?: string | null;
  /** Anything that sits between the title and the bell. */
  children?: React.ReactNode;
}) {
  return (
    <header
      /* Clear of the notch when the portal is running without browser
         chrome, and clear of a rounded corner at the sides. */
      className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-canvas px-[max(1.5rem,env(safe-area-inset-left))] pt-[calc(0.875rem+env(safe-area-inset-top))] pb-3.5"
    >
      <span className="md:hidden">
        <FlameMark size={28} logoUrl={logoUrl} churchName={churchName} />
      </span>
      {title ? (
        <h1 className="min-w-0 flex-1 truncate font-display text-[28px] leading-[34px] text-fg">
          {title}
        </h1>
      ) : (
        <span className="min-w-0 flex-1" />
      )}
      {children}
      {bell}
    </header>
  );
}
