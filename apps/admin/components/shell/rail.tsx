"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, Building2, Gauge, GitBranch, LogOut, PanelLeftClose, PanelLeftOpen,
  ScrollText, ShieldCheck,
} from "lucide-react";
import { Avatar, Tooltip, cn } from "@connectapp/ui";
import { Brand, Mark } from "../brand";
import { GROUPS, activeHref } from "./nav";
import { setRailCollapsed } from "./rail-actions";
import { signOut } from "@/app/actions";
import type { TeamMember } from "@/lib/admin";

/**
 * One mark a section. Kept here rather than in `nav.ts` because that file is
 * imported by the server as well and holds no React.
 */
const MARKS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/": Gauge,
  "/churches": Building2,
  "/status": Activity,
  "/delivery": GitBranch,
  "/log": ScrollText,
  "/team": ShieldCheck,
};

/**
 * HRT-393, R24.6, R24.14. The navigation down the left of the team portal.
 *
 * 240px open, 64px collapsed, remembered in a cookie so it returns the way it
 * was left. Collapsed, every row keeps its label in a tooltip, without which an
 * icon-only rail cannot be read.
 *
 * Opaque. The rail this replaces carried `backdrop-blur-[8px]`, and
 * glassmorphism is on the refused list in docs/design-system.md twice over:
 * it costs contrast and it costs frames on an old machine.
 *
 * Darker than the product's own shell on purpose. This screen reaches every
 * church on the platform and the one thing it must never be mistaken for is a
 * church's own, so it does not look like one.
 */
export function Rail({
  who,
  collapsed: initial,
  onNavigate,
  floating,
}: {
  who: TeamMember;
  collapsed: boolean;
  /** Whether this portal is pointed at the churches' own records. */
  /** Closes the sheet the rail is inside, on a phone. */
  onNavigate?: () => void;
  /** Drawn inside a sheet rather than as the page's own column. */
  floating?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(initial);
  const active = activeHref(pathname);

  /* Inside the sheet there is no room to collapse and nothing to collapse for. */
  const shut = floating ? false : collapsed;

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    void setRailCollapsed(next);
  };

  const toggleLabel = shut ? "Open the navigation" : "Close the navigation";

  return (
    <nav
      aria-label="Sections"
      className={cn(
        "flex shrink-0 flex-col gap-4 overflow-hidden bg-shell text-shell-fg",
        "border-r border-shell-line px-3 py-4",
        floating ? "h-full w-full" : "h-full",
        !floating && "motion-safe:transition-[width] motion-safe:duration-(--duration-base) motion-safe:ease-(--ease-out)",
        !floating && (shut ? "w-16 px-2" : "w-60"),
      )}
    >
      <div className={cn("flex items-center gap-2", shut ? "justify-center" : "justify-between")}>
        <Link
          href="/"
          onClick={onNavigate}
          aria-label="ConnectApp Admin"
          className="flex min-w-0 items-center gap-2.5 rounded-md no-underline focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none"
        >
          {shut ? (
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary">
              <Mark className="text-[1.125rem]" />
            </span>
          ) : (
            <Brand onShell />
          )}
        </Link>

        {floating ? null : (
          <Tooltip content={toggleLabel} side="right">
            <button
              type="button"
              onClick={toggle}
              aria-label={toggleLabel}
              aria-expanded={!shut}
              className={cn(
                "grid size-8 shrink-0 cursor-pointer place-items-center rounded-md",
                "text-shell-muted hover:bg-shell-line hover:text-shell-fg",
                "focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none",
                shut && "absolute opacity-0 focus-visible:static focus-visible:opacity-100",
              )}
            >
              {shut ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
            </button>
          </Tooltip>
        )}
      </div>

      {/*
        HRT-397. Which set of records is behind this screen.
        The portal runs against development as readily as production, and an
        A team member archiving a church needs to know which one they are archiving.
      */}

      {shut ? (
        <Tooltip content={toggleLabel} side="right">
          <button
            type="button"
            onClick={toggle}
            aria-label={toggleLabel}
            aria-expanded={false}
            className="grid size-9 shrink-0 cursor-pointer place-items-center self-center rounded-md text-shell-muted hover:bg-shell-line hover:text-shell-fg focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none"
          >
            <PanelLeftOpen className="size-[18px]" />
          </button>
        </Tooltip>
      ) : null}

      <div className="scroll-quiet flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
        {GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            {shut ? (
              <span aria-hidden className="mx-auto my-1 h-px w-6 bg-shell-line" />
            ) : (
              <h2 className="px-2.5 pb-1 text-[11px] font-semibold tracking-[0.1em] text-shell-muted uppercase">
                {group.label}
              </h2>
            )}

            {group.entries.map((entry) => {
              const Icon = MARKS[entry.href] ?? Gauge;
              const on = active === entry.href;
              const row = (
                <Link
                  href={entry.href}
                  prefetch={entry.costly ? false : undefined}
                  onClick={onNavigate}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-lg text-[14px] font-medium no-underline",
                    "transition-colors duration-instant",
                    "focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none",
                    shut ? "justify-center px-0" : "px-2.5",
                    on
                      ? "bg-surface font-semibold text-fg shadow-sm"
                      : "text-shell-muted hover:bg-shell-line hover:text-shell-fg",
                  )}
                >
                  <Icon className="size-[18px] shrink-0" aria-hidden />
                  {shut ? null : <span className="truncate">{entry.label}</span>}
                </Link>
              );

              return shut ? (
                <Tooltip key={entry.href} content={entry.label} side="right">{row}</Tooltip>
              ) : (
                <React.Fragment key={entry.href}>{row}</React.Fragment>
              );
            })}
          </div>
        ))}
      </div>

      <div className={cn("flex shrink-0 flex-col gap-2 border-t border-shell-line pt-3", shut && "items-center")}>
        <Tooltip content={`${who.name}, ${who.email}`} side="right">
          <Link
            href="/security"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg no-underline",
              "focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none",
              shut ? "p-0.5" : "px-1.5 py-1 hover:bg-shell-line",
            )}
          >
            <Avatar name={who.name} id={who.id} size="sm" className="size-8 text-[12px]" />
            {shut ? null : (
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-[13px] font-medium text-shell-fg">{who.name}</span>
                <span className="truncate text-[12px] text-shell-muted">{who.email}</span>
              </span>
            )}
          </Link>
        </Tooltip>

        <form action={signOut}>
          <Tooltip content="Sign out" side="right">
            <button
              type="submit"
              aria-label="Sign out"
              className={cn(
                "flex h-9 cursor-pointer items-center gap-3 rounded-lg text-[13px] font-medium",
                "text-shell-muted hover:bg-shell-line hover:text-shell-fg",
                "focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none",
                shut ? "w-9 justify-center" : "w-full px-2.5",
              )}
            >
              <LogOut className="size-[18px] shrink-0" aria-hidden />
              {shut ? null : "Sign out"}
            </button>
          </Tooltip>
        </form>
      </div>
    </nav>
  );
}

