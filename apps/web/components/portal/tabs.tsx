"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BellOff, Download, LogOut, Settings } from "lucide-react";
import {
  Avatar,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, Working,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { useInstall, usePush } from "./installed";
import { Opening } from "../opening";

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

  /*
   * The longest match wins, so /home/schedule lights Serving and leaves Home
   * alone. Matching on a prefix alone underlined both, because every member
   * screen lives under /home.
   */
  const reach = (tab: PortalTab) => {
    let best = -1;
    for (const one of tab.owns ?? [tab.href]) {
      if (path === one || path.startsWith(`${one}/`)) best = Math.max(best, one.length);
    }
    return best;
  };
  const lit = Math.max(...tabs.map(reach));
  const on = (tab: PortalTab) => lit >= 0 && reach(tab) === lit;

  return (
    <nav
      className={
        /* On a phone the tabs take a line of their own under the church name
           and scroll sideways. Wrapping them put Serving on top of the avatar. */
        "-mb-px order-last flex w-full min-w-0 items-stretch overflow-x-auto " +
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden " +
        "sm:order-none sm:w-auto sm:flex-1"
      }
    >
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
          <Opening />
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
  photoUrl,
}: {
  name: string;
  userId: string;
  church: string;
  /** R2.9. Their own face, when they have uploaded one. */
  photoUrl?: string | null;
}) {
  /*
   * The form sits outside the menu and is submitted by the item.
   * A form inside a DropdownMenuItem never posts: Radix handles the press on
   * the item itself and closes the menu, so the submit button underneath is
   * never the thing that was clicked.
   */
  const out = React.useRef<HTMLFormElement>(null);
  const [going, setGoing] = React.useState(false);
  const install = useInstall();
  const push = usePush(church);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={name}
          className="ml-auto flex shrink-0 cursor-pointer items-center gap-2.5 rounded-full py-1 pl-1 pr-2 hover:bg-sunken"
        >
          <Avatar name={name} src={photoUrl} id={userId} size="sm" className="size-9 text-[13px] font-semibold" />
          <span className="hidden text-[14px] font-medium text-fg sm:inline">{name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/settings/profile?church=${church}`}>
            <Settings /> {t("settings.tab.profile")}
          </Link>
        </DropdownMenuItem>
        {push ? (
          <DropdownMenuItem
            disabled={push.busy}
            onSelect={(e) => { e.preventDefault(); push.toggle(); }}
          >
            {push.on ? <BellOff /> : <Bell />}
            {push.on ? t("portal.notifyOff") : t("portal.notifyOn")}
          </DropdownMenuItem>
        ) : null}
        {install ? (
          <DropdownMenuItem onSelect={install}>
            <Download /> {t("portal.install")}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={going}
          onSelect={() => {
            setGoing(true);
            out.current?.requestSubmit();
          }}
        >
          <LogOut /> {t("action.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>

      {/* The post navigates the whole page, and the menu has already closed,
          so the wait is covered. */}
      <Working open={going} label={t("common.signingOut")} />
      <form ref={out} action="/auth/sign-out" method="post" hidden />
    </DropdownMenu>
  );
}
