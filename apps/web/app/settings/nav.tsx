"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

export interface SettingsLink {
  href: string;
  label: string;
}

export interface SettingsGroup {
  /** The quiet heading over the group, already in the reader's language. */
  title: string;
  items: SettingsLink[];
}

/**
 * R24.6. The settings menu as one frozen row across the top.
 *
 * Twelve names down the left outgrew the column. Each section carries its own
 * list, which opens under the pointer, and the section holding the open screen
 * wears a line in the church's purple. The heading is a link to the first
 * screen in the section, so a press always lands somewhere and the keyboard
 * reaches the list through focus rather than through a press.
 */
export function SettingsNav({ groups, church }: { groups: SettingsGroup[]; church: string }) {
  const pathname = usePathname();
  /*
   * The list closes when something in it is chosen.
   *
   * It opens on hover, and after a press the pointer is still sitting where it
   * was, so without this the list stays open over the screen it just opened.
   * It comes back the next time the pointer leaves and returns.
   */
  const [chosen, setChosen] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  React.useEffect(() => () => clearTimeout(timer.current), []);

  /*
   * It closes a moment after the press rather than on it. The screen behind is
   * still arriving, and a list that vanishes under the finger reads as a
   * mis-tap.
   */
  const closeSoon = (title: string) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setChosen(title), 1400);
  };

  /*
   * R17.1. A member has one section, so its screens are the row.
   *
   * A menu with a single heading, hiding three names behind a hover, is a door
   * in front of a door.
   */
  const only = groups.length === 1 ? groups[0]! : null;
  if (only) {
    return (
      <nav
        aria-label={t("settings.sections")}
        className="sticky top-0 z-20 -mt-1 flex flex-wrap items-stretch border-b border-line bg-canvas"
      >
        {only.items.map((item, at) => (
          <div key={item.href} className="flex items-stretch">
            {at === 0 ? null : <span aria-hidden className="my-2.5 w-px bg-line" />}
            <Link
              href={`${item.href}?church=${church}`}
              aria-current={item.href === pathname ? "page" : undefined}
              className={cn(
                "flex items-center px-6 py-3",
                "text-[length:var(--d-text-label)] no-underline",
                "border-b-2 -mb-px",
                item.href === pathname
                  ? "border-primary font-semibold text-fg"
                  : "border-transparent font-medium text-fg-muted hover:text-fg",
              )}
            >
              {item.label}
            </Link>
          </div>
        ))}
      </nav>
    );
  }

  return (
    <nav
      aria-label={t("settings.sections")}
      className="sticky top-0 z-20 -mt-1 flex flex-wrap items-stretch border-b border-line bg-canvas"
    >
      {groups.map((group, at) => {
        const open = group.items.find((item) => item.href === pathname);
        const first = group.items[0]!;

        return (
          <div
            key={group.title}
            className="group relative flex items-stretch"
            onMouseLeave={() => {
              clearTimeout(timer.current);
              setChosen((was) => (was === group.title ? null : was));
            }}
          >
            {/* A hairline between one section and the next. */}
            {at === 0 ? null : <span aria-hidden className="my-2.5 w-px bg-line" />}

            <Link
              href={`${first.href}?church=${church}`}
              aria-current={open ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 px-6 py-3",
                "text-[length:var(--d-text-label)] no-underline",
                "border-b-2 -mb-px",
                open
                  ? "border-primary font-semibold text-fg"
                  : "border-transparent font-medium text-fg-muted hover:text-fg",
              )}
            >
              {group.title}
              {open ? <span className="font-normal text-fg-subtle">· {open.label}</span> : null}
            </Link>

            {/* Under the pointer rather than behind a press. Focus opens it
                too, so the keyboard reaches every screen in the section. */}
            <div
              className={cn(
                "invisible absolute top-full left-0 z-30 min-w-[11rem] translate-y-0 opacity-0",
                "rounded-lg border border-line bg-surface p-1 shadow-lg",
                "transition-opacity duration-instant",
                chosen === group.title
                  ? "pointer-events-none"
                  : [
                      "group-hover:visible group-hover:opacity-100",
                      "group-focus-within:visible group-focus-within:opacity-100",
                    ],
              )}
            >
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={`${item.href}?church=${church}`}
                  aria-current={item.href === pathname ? "page" : undefined}
                  onClick={(event) => {
                    closeSoon(group.title);
                    // Focus would hold it open on its own.
                    event.currentTarget.blur();
                  }}
                  className={cn(
                    "flex min-h-[var(--d-tap)] items-center rounded-md px-2.5 no-underline",
                    "text-[length:var(--d-text-body)] hover:bg-sunken",
                    item.href === pathname ? "font-semibold text-fg" : "text-fg-muted",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
