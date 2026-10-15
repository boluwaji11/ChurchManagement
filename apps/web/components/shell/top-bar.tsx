import * as React from "react";
import { FlameMark } from "../brand";

/**
 * R24.6, R24.11. The bar across the top of the product.
 *
 * 14px of padding with 24px at the sides, a hairline under it, the canvas
 * behind it, and 12px between its parts. The screen's name is IBM Plex Serif at
 * 28px over a 34px line, which is where a reader looks to know where they are.
 *
 * The bar belongs to the frame, which is a layout and is kept across a
 * navigation, so the name cannot be passed up from the screen and cannot be
 * resolved in the layout either: the layout does not run again when the screen
 * changes. `ScreenName` reads the address in the browser, the same way the
 * sidebar lights its row.
 *
 * There is no search box here. Cmd+K opens the palette from anywhere, and a
 * box in the chrome of every screen earns its width on none of them.
 *
 * The mark appears here only on a phone, where there is no sidebar carrying it.
 */
export function TopBar({
  name,
  bell,
  logoUrl,
  churchName,
  children,
}: {
  /**
   * The screen's name, which reads the address itself. A record names itself in
   * its own content, with the person's or the service's own name.
   */
  name?: React.ReactNode;
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
      {name ?? <span className="min-w-0 flex-1" />}
      {children}
      {bell}
    </header>
  );
}
