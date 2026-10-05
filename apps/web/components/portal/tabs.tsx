"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import {
  Avatar,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";

export interface PortalTab {
  label: string;
  href: string;
  /** The other addresses that belong to this tab, so a group's own page lights it. */
  owns?: string[];
}

/**
 * R17.1. The member's own navigation: a row of tabs across the top.
 *
 * The design gives a member a different frame from the one staff work in, and
 * that is the point of it. Staff live in the product all week and want a
 * sidebar they can scan. A member opens it two or three times a year, on a
 * phone, usually because the church asked them something, and four words
 * across the top is the whole of what they need to find.
 *
 * 64px tall so the underline sits on the header's own edge, which is what
 * marks the tab rather than a pill or a fill.
 */
export function PortalTabs({ tabs, church }: { tabs: PortalTab[]; church: string }) {
  const path = usePathname();

  const on = (tab: PortalTab) => {
    const owns = tab.owns ?? [tab.href];
    return owns.some((one) => path === one || path.startsWith(`${one}/`));
  };

  return (
    <nav className="-mb-px flex min-w-0 flex-1 flex-wrap items-stretch">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={`${tab.href}?church=${church}`}
          aria-current={on(tab) ? "page" : undefined}
          className={
            on(tab)
              ? "flex min-h-[52px] items-center whitespace-nowrap border-b-2 border-primary px-3 text-[15px] font-semibold text-fg sm:min-h-16"
              : "flex min-h-[52px] items-center whitespace-nowrap border-b-2 border-transparent px-3 text-[15px] font-medium text-fg-muted hover:text-fg sm:min-h-16"
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

/** Who is signed in, and the two things they can do about it. */
export function PortalAccount({
  name,
  userId,
  church,
}: {
  name: string;
  userId: string;
  church: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={name}
          className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-full py-1 pl-1 pr-2 hover:bg-sunken"
        >
          <Avatar name={name} id={userId} size="sm" className="size-9 text-[13px] font-semibold" />
          <span className="hidden text-[14px] font-medium text-fg sm:inline">{name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/settings/profile?church=${church}`}>
            <Settings /> {t("nav.settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action="/auth/sign-out" method="post" className="contents">
            <button type="submit" className="flex w-full cursor-pointer items-center gap-2 text-left">
              <LogOut /> {t("action.signOut")}
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
