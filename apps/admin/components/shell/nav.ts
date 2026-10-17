/**
 * HRT-393, R21.x. The portal's sections, and which one the current address
 * sits under.
 *
 * Pure, and imported by the rail, which runs in the browser. Nothing here may
 * reach for the database or a node built-in: `@connectapp/db` pulls in
 * `node:crypto` and a client component that imports it will not build.
 */

export interface Section {
  href: string;
  label: string;
  /** The routes this entry lights up for, beyond its own. */
  owns?: string[];
}

export interface Group {
  /** Drawn above the entries when the rail is open, and never when it is shut. */
  label: string;
  entries: Section[];
}

/**
 * Three groups rather than one list of seven.
 *
 * The first is the churches and the people in them, which is what the portal
 * was built for. The second is the platform's own machinery, which is new. The
 * third is the record, which is read rarely and on purpose.
 */
export const GROUPS: Group[] = [
  {
    label: "Churches",
    entries: [
      { href: "/", label: "Overview" },
      { href: "/churches", label: "Churches" },
      { href: "/accounts", label: "Accounts" },
    ],
  },
  {
    label: "Platform",
    entries: [
      { href: "/status", label: "Status" },
      { href: "/delivery", label: "Delivery" },
    ],
  },
  {
    label: "Record",
    entries: [
      { href: "/log", label: "Log" },
      { href: "/operators", label: "Operators" },
    ],
  },
];

export const SECTIONS: Section[] = GROUPS.flatMap((group) => group.entries);

/**
 * Longest match wins, so `/churches/abc` lights Churches while `/` lights only
 * Overview. Without the length test every address would match `/`.
 */
export function activeHref(pathname: string): string | null {
  let best: { href: string; depth: number } | null = null;

  for (const entry of SECTIONS) {
    for (const prefix of entry.owns ?? [entry.href]) {
      const here = prefix === "/" ? pathname === "/" : pathname === prefix || pathname.startsWith(`${prefix}/`);
      if (!here) continue;
      const depth = prefix.split("/").filter(Boolean).length;
      if (!best || depth > best.depth) best = { href: entry.href, depth };
    }
  }
  return best?.href ?? null;
}

/** What the screen is called, for the bar across the top of a phone. */
export function screenName(pathname: string): string {
  const href = activeHref(pathname);
  return SECTIONS.find((one) => one.href === href)?.label ?? "ConnectApp Admin";
}
