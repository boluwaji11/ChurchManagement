"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, ChevronsUpDown, LogOut } from "lucide-react";
import { Avatar, Tooltip, cn } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { FlameMark } from "../brand";
import { activeHref, type NavTarget } from "./nav-active";
import { setSidebarCollapsed } from "./sidebar-actions";

/** A nav entry with its icon already drawn, so this file holds no database. */
export interface ShellEntry extends NavTarget {
  label: string;
  icon: React.ReactNode;
}

/**
 * R24.6. The navigation down the left of the staff app.
 *
 * Every measurement here is the one in docs/redesign/design: 232px wide, 64px
 * collapsed, 20px of padding with 12px at the sides, 24px between the three
 * blocks, 36px rows with an 8px radius and 2px between them.
 *
 * The width is remembered in a cookie so it comes back the way it was left, and
 * collapsed every row keeps its words in a tooltip.
 *
 * Hidden under 768px, where the tab bar takes over.
 */
export function Sidebar({
  entries,
  churchName,
  personName,
  roleName,
  userId,
  church,
  collapsed: initial,
}: {
  entries: ShellEntry[];
  churchName: string;
  personName: string;
  roleName: string;
  userId: string;
  church: string;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(initial);

  const active = activeHref(entries, pathname);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    void setSidebarCollapsed(next);
  };

  const toggleLabel = collapsed ? t("shell.expand") : t("shell.collapse");

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col gap-6 overflow-y-auto overflow-x-hidden",
        "border-r border-line bg-sunken md:flex",
        "motion-safe:transition-[width] motion-safe:duration-(--duration-base) motion-safe:ease-(--ease-out)",
        collapsed ? "w-16 px-2.5 py-5" : "w-58 px-3 py-5",
      )}
    >
      <div className={cn("flex items-center", collapsed ? "flex-col gap-2" : "gap-2.5 pl-2")}>
        <Link href="/choose-church" className="flex min-w-0 items-center gap-2.5" aria-label={t("app.name")}>
          <FlameMark />
          {collapsed ? null : (
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-display text-[18px] leading-5 text-fg">{t("app.name")}</span>
              <span className="truncate text-[12px] text-fg-subtle">{churchName}</span>
            </span>
          )}
        </Link>

        <Tooltip content={toggleLabel} side="right">
          <button
            type="button"
            onClick={toggle}
            aria-label={toggleLabel}
            aria-expanded={!collapsed}
            className="grid size-[30px] shrink-0 place-items-center rounded-sm text-fg-muted hover:bg-line"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-[18px]" />
            ) : (
              <PanelLeftClose className="size-[18px]" />
            )}
          </button>
        </Tooltip>
      </div>

      <nav className="flex flex-col gap-0.5" aria-label={t("nav.sections")}>
        {entries.map((entry) => {
          const on = active === entry.href;
          const row = (
            <Link
              href={`${entry.href}?church=${church}`}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex h-9 w-full items-center gap-2.5 rounded-sm text-left text-[13px] font-medium",
                collapsed ? "justify-center px-0" : "px-2.5",
                on
                  ? "bg-surface text-fg shadow-sm"
                  : "text-fg-muted hover:bg-line hover:text-fg",
              )}
            >
              <span className="grid shrink-0 place-items-center [&_svg]:size-[18px]">
                {entry.icon}
              </span>
              {collapsed ? null : (
                <span className="truncate whitespace-nowrap">{entry.label}</span>
              )}
            </Link>
          );

          return collapsed ? (
            <Tooltip key={entry.href} content={entry.label} side="right">
              {row}
            </Tooltip>
          ) : (
            <React.Fragment key={entry.href}>{row}</React.Fragment>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <Link
          href={`/settings?church=${church}`}
          className={cn(
            "flex w-full items-center gap-2.5 text-left",
            collapsed
              ? "justify-center rounded-md border border-transparent p-1"
              : "rounded-md border border-line bg-surface p-2 hover:border-line-strong",
          )}
        >
          <Avatar name={personName} id={userId} size="sm" className="size-8 text-[12px] font-semibold" />
          {collapsed ? null : (
            <>
              <span className="flex min-w-0 flex-1 flex-col leading-4">
                <span className="truncate text-[13px] font-medium text-fg">{personName}</span>
                <span className="truncate text-[12px] text-fg-subtle">{roleName}</span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-fg-subtle" aria-hidden />
            </>
          )}
        </Link>

        <form action="/auth/sign-out" method="post" className="contents">
          <Tooltip content={t("action.signOut")} side="right">
            <button
              type="submit"
              aria-label={t("action.signOut")}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-sm text-[13px] font-medium text-fg-muted hover:bg-line",
                collapsed ? "justify-center px-0" : "px-2.5",
              )}
            >
              <LogOut className="size-[18px] shrink-0" aria-hidden />
              {collapsed ? null : <span className="whitespace-nowrap">{t("action.signOut")}</span>}
            </button>
          </Tooltip>
        </form>
      </div>
    </aside>
  );
}

/**
 * R24.6. The same list across the bottom of a phone.
 *
 * Five fit. 6px of padding with the safe area under it, 22px icons over an 11px
 * label, the current one in the accent at 600 and the rest subtle at 500.
 */
export function MobileTabs({ entries, church }: { entries: ShellEntry[]; church: string }) {
  const pathname = usePathname();
  const active = activeHref(entries, pathname);

  return (
    <nav
      aria-label={t("nav.sections")}
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-canvas px-1 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] md:hidden"
    >
      {entries.slice(0, 5).map((entry) => {
        const on = active === entry.href;
        return (
          <Link
            key={entry.href}
            href={`${entry.href}?church=${church}`}
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex min-h-11 flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px]",
              on ? "font-semibold text-primary" : "font-medium text-fg-subtle",
            )}
          >
            <span className="grid place-items-center [&_svg]:size-[22px]">{entry.icon}</span>
            <span className="truncate">{entry.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
