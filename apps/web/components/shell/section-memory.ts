"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { activeHref, type NavTarget } from "./nav-active";

const KEY = "hearth:section";

/**
 * R24.6. Where you were, the last time you were in this section.
 *
 * Pressing People, going to Settings and pressing People again should put
 * somebody back where they left off, not at the top of a list they have
 * already scrolled past. Settings is the sharp case: its entry points at a
 * section with ten screens in it, and landing on the first one every time
 * makes the navigation feel like it forgot.
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
    if (!section) return;
    const all = read();
    all[section] = query ? `${pathname}?${query}` : pathname;
    write(all);
    // entries is rebuilt on every render of the server component above, so it
    // is deliberately not a dependency: the path and the query are what change.
  }, [pathname, query]); // eslint-disable-line react-hooks/exhaustive-deps

  /** The href to open for a section, which is where it was left. */
  return React.useCallback((href: string, fallback: string) => {
    const remembered = read()[href];
    // Only within the section it was recorded for. A stale entry pointing
    // somewhere else would send somebody to a screen they did not press.
    if (remembered && (remembered === href || remembered.startsWith(`${href}/`)
      || remembered.startsWith(`${href}?`))) {
      return remembered;
    }
    return fallback;
  }, []);
}
