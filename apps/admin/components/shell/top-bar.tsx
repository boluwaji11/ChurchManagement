"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, ShieldCheck } from "lucide-react";
import {
  Avatar, DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, cn,
} from "@connectapp/ui";
import { Brand } from "../brand";
import { GROUPS, activeHref, screenName } from "./nav";
import { signOut } from "@/app/actions";
import type { TeamMember } from "@/lib/admin";

/**
 * HRT-393, R24.6. The portal on a narrow screen.
 *
 * The rail is 240px of a 390px screen, which leaves nothing to read an
 * a team member's own screens in, so below the sidebar's breakpoint it comes off
 * and the sections move into a menu.
 *
 * A menu rather than the row of chips that was here before. Seven sections
 * scrolling sideways means the four past the edge are found by dragging, and
 * a reader cannot see how many there are.
 */
export function TopBar({ who }: { who: TeamMember }) {
  const pathname = usePathname();
  const active = activeHref(pathname);

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-shell-line bg-shell px-3 py-2 text-shell-fg md:hidden">
      <Link href="/" aria-label="ConnectApp Admin" className="flex shrink-0 items-center gap-2.5 no-underline">
        <Brand onShell />
      </Link>

      <span className="min-w-0 flex-1 truncate text-right text-[13px] font-medium text-shell-muted">
        {screenName(pathname)}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Sections"
          className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-md text-shell-muted hover:bg-shell-line hover:text-shell-fg focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none"
        >
          <Menu className="size-5" aria-hidden />
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          {GROUPS.map((group, i) => (
            <div key={group.label}>
              {i === 0 ? null : <DropdownMenuSeparator />}
              {group.entries.map((entry) => (
                <DropdownMenuItem key={entry.href} asChild>
                  <Link
                    href={entry.href}
                    prefetch={entry.costly ? false : undefined}
                    className={cn("no-underline", active === entry.href && "font-semibold text-fg")}
                  >
                    {entry.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </div>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/security" className="no-underline">
              <ShieldCheck /> {who.name}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild tone="danger">
            <form action={signOut}>
              <button type="submit" className="flex w-full cursor-pointer items-center gap-2 text-left">
                <LogOut /> Sign out
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Avatar name={who.name} id={who.id} size="sm" className="size-7 shrink-0 text-[11px]" />
    </header>
  );
}
