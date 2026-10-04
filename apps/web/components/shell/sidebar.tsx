"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Avatar, Tooltip, cn } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { Mark } from "../brand";
import { activeHref, type NavTarget } from "./nav-active";
import { setSidebarCollapsed } from "./sidebar-actions";

/** A nav entry with its icon already drawn, so this file holds no database. */
export interface ShellEntry extends NavTarget {
  label: string;
  icon: React.ReactNode;
  count?: number;
}

/**
 * R24.6. The navigation down the left of the staff app.
 *
 * It collapses to a 64px rail of icons, and the width is remembered in a cookie
 * so it comes back the way it was left. Collapsed, every entry keeps its words
 * in a tooltip, which is what makes an icon-only rail readable rather than a
 * memory test.
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
  signOut,
}: {
  entries: ShellEntry[];
  churchName: string;
  personName: string;
  roleName: string;
  userId: string;
  church: string;
  collapsed: boolean;
  signOut: React.ReactNode;
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
        "sticky top-0 hidden h-dvh shrink-0 flex-col gap-6 overflow-y-auto overflow-x-hidden",
        "border-r border-line bg-sunken md:flex",
        "motion-safe:transition-[width] motion-safe:duration-(--duration-base) motion-safe:ease-(--ease-out)",
        collapsed ? "w-16 px-2.5 py-5" : "w-58 px-3 py-5",
      )}
    >
      <div className={cn("flex items-center gap-2.5", collapsed ? "flex-col gap-2" : "pl-2")}>
        <Link
          href={`/choose-church`}
          className="flex min-w-0 items-center gap-2 rounded-md"
          aria-label={t("app.name")}
        >
          <Mark className="shrink-0 text-[1.35rem]" />
          {collapsed ? null : (
            <span className="flex min-w-0 flex-col">
              <span className="font-display text-title text-fg">{t("app.name")}</span>
              <span className="truncate text-caption text-fg-subtle">{churchName}</span>
            </span>
          )}
        </Link>

        <Tooltip content={toggleLabel} side="right">
          <button
            type="button"
            onClick={toggle}
            aria-label={toggleLabel}
            aria-expanded={!collapsed}
            className="grid size-[30px] shrink-0 place-items-center rounded-lg text-fg-muted hover:bg-line"
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
          const link = (
            <Link
              href={`${entry.href}?church=${church}`}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-label",
                collapsed && "justify-center px-0",
                on
                  ? "bg-surface text-fg shadow-sm"
                  : "text-fg-muted hover:bg-line hover:text-fg",
              )}
            >
              <span className="grid size-[18px] shrink-0 place-items-center [&_svg]:size-[18px]">
                {entry.icon}
              </span>
              {collapsed ? null : (
                <>
                  <span className="truncate">{entry.label}</span>
                  {entry.count ? (
                    <span className="ml-auto text-caption text-fg-subtle">{entry.count}</span>
                  ) : null}
                </>
              )}
            </Link>
          );

          return collapsed ? (
            <Tooltip key={entry.href} content={entry.label} side="right">
              {link}
            </Tooltip>
          ) : (
            <React.Fragment key={entry.href}>{link}</React.Fragment>
          );
        })}
      </nav>

      {/* Their name and their role, and the way out underneath it rather than
          beside it, since a press next to the name somebody aims for is a press
          they make by accident. */}
      <div className="mt-auto flex flex-col gap-1.5">
        <Link
          href={`/settings?church=${church}`}
          className={cn(
            "flex items-center gap-2.5 rounded-md text-left",
            collapsed
              ? "justify-center border border-transparent p-1"
              : "border border-line bg-surface p-2 hover:border-line-strong",
          )}
        >
          <Avatar name={personName} id={userId} size="sm" />
          {collapsed ? null : (
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-label text-fg">{personName}</span>
              <span className="truncate text-caption text-fg-subtle">{roleName}</span>
            </span>
          )}
        </Link>

        <div className={cn("flex", collapsed ? "justify-center" : "flex-col")}>{signOut}</div>
      </div>
    </aside>
  );
}

/**
 * R24.6. The same list across the bottom of a phone.
 *
 * Five fit at a 44px target. The rest of a role's navigation is reached through
 * the screens themselves, which is the trade a tab bar makes.
 */
export function MobileTabs({
  entries,
  church,
}: {
  entries: ShellEntry[];
  church: string;
}) {
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
              "flex min-h-11 flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-caption",
              on ? "font-semibold text-accent" : "font-medium text-fg-subtle",
            )}
          >
            <span className="grid size-[22px] place-items-center [&_svg]:size-[22px]">
              {entry.icon}
            </span>
            <span className="truncate">{entry.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
