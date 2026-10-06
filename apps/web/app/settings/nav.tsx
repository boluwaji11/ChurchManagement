"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  cn, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@connectapp/ui";
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
 * Twelve names down the left outgrew the column, and a church reading a screen
 * should not scroll a menu to reach the next one. Each section is a press that
 * opens its own list, the row stays put while the screen under it scrolls, and
 * the section holding the open screen is marked.
 */
export function SettingsNav({ groups, church }: { groups: SettingsGroup[]; church: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("settings.sections")}
      className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-1 border-b border-line bg-canvas px-1 py-2"
    >
      {groups.map((group) => {
        const here = group.items.some((item) => item.href === pathname);
        const open = group.items.find((item) => item.href === pathname);

        return (
          <DropdownMenu key={group.title}>
            <DropdownMenuTrigger
              className={cn(
                "flex h-9 cursor-pointer items-center gap-1.5 rounded-sm px-3",
                "text-[length:var(--d-text-label)] outline-none",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
                here
                  ? "bg-line font-semibold text-fg"
                  : "font-medium text-fg-muted hover:bg-line hover:text-fg",
              )}
            >
              {group.title}
              {/* The screen being read, named on the section that holds it, so
                  the row says where you are without opening anything. */}
              {open ? <span className="text-fg-subtle">· {open.label}</span> : null}
              <ChevronDown className="size-3.5 opacity-60" aria-hidden />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start">
              {group.items.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link
                    href={`${item.href}?church=${church}`}
                    aria-current={item.href === pathname ? "page" : undefined}
                    className={cn(
                      "no-underline",
                      item.href === pathname ? "font-semibold text-fg" : "text-fg-muted",
                    )}
                  >
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </nav>
  );
}
