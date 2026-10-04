"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { activeHref, type NavTarget } from "./nav-active";

const KEY = "hearth:section";

/**
 * The sections that reopen where they were left.
 *
 * A short list on purpose. Everywhere else, the nav entry means the screen it
 * names.
 */
const REMEMBERED = ["/settings"];

/**
 * R24.6. Where you were, the last time you were in this section.
 *
 * Only for a section that is a menu of screens rather than a list of records.
 * Settings is the case it exists for: its entry points at ten screens, and
 * landing on the first one every time makes the navigation feel like it forgot.
 * Pressing Groups, by contrast, means the groups, not the group somebody was
 * last reading, so those sections are left alone.
 *
 * Held in sessionStorage, so it lasts as long as the tab and never follows
 * anybody to another device. Every read and write is guarded: a private window
 * can refuse both, and a sidebar that throws is worse than one that forgets.
 */
function read(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function write(all: Record<string, string>): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // A browser that will not store it is a browser that does not remember.
  }
}

/**
 * Records the current screen against the section it belongs to, and answers
 * where a given section should reopen.
 */
export function useSectionMemory(entries: NavTarget[]) {
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.toString();

  React.useEffect(() => {
    const section = activeHref(entries, pathname);
    if (!section || !REMEMBERED.includes(section)) return;
    const all = read();
    all[section] = query ? `${pathname}?${query}` : pathname;
    write(all);
    // entries is rebuilt on every render of the server component above, so it
    // is deliberately not a dependency: the path and the query are what change.
  }, [pathname, query]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Where a section should reopen, or null for the screen it names.
   *
   * Read when the link is pressed rather than while it renders: the server has
   * no sessionStorage, so an href computed from it would not match what the
   * browser draws and the tree would fail to hydrate.
   */
  return React.useCallback((href: string): string | null => {
    if (!REMEMBERED.includes(href)) return null;
    const remembered = read()[href];
    // Only within the section it was recorded for. A stale entry pointing
    // somewhere else would send somebody to a screen they did not press.
    if (remembered && (remembered === href || remembered.startsWith(`${href}/`)
      || remembered.startsWith(`${href}?`))) {
      return remembered;
    }
    return null;
  }, []);
}
