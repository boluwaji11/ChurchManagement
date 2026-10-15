"use client";

import { usePathname } from "next/navigation";
import { activeHref, type NavTarget } from "./nav-active";

/**
 * R24.6, R24.11. The screen's name, across the top of the product.
 *
 * It reads the address rather than being handed a name, because the bar is part
 * of the frame and the frame is a layout: Next keeps a layout across a
 * navigation and fetches only the screen under it, so a name resolved up there
 * is the name of whichever screen was opened first. The bar said Services while
 * the reader was on the calendar until this read the path in the browser, which
 * is the same thing the sidebar does to light the row it is on.
 *
 * Resolved against the same navigation the sidebar draws, so the lit row and
 * the word in the bar can never disagree. A screen with no entry of its own
 * wears its area's name, which is why every settings screen says Settings.
 */
export function ScreenName({
  entries,
}: {
  entries: (NavTarget & { label: string })[];
}) {
  const pathname = usePathname();
  const here = activeHref(entries, pathname);
  const name = entries.find((entry) => entry.href === here)?.label;

  if (!name) return <span className="min-w-0 flex-1" />;

  return (
    <h1 className="min-w-0 flex-1 truncate font-display text-[28px] font-normal leading-[34px] text-fg">
      {name}
    </h1>
  );
}
