"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, LogOut, Menu } from "lucide-react";
import { Avatar, Sheet, SheetContent, Tooltip, Working, cn } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { FlameMark } from "../brand";
import { activeHref, type NavTarget } from "./nav-active";
import { useSectionMemory, forgetSection, clearSectionMemory } from "./section-memory";
import { setSidebarCollapsed } from "./sidebar-actions";
import { Opening } from "../opening";

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
/**
 * R24.6. The church's own name at the top of the sidebar, sized to fit.
 *
 * "Grace Chapel" and "Riverside Community Fellowship of the Valley" both have
 * to live in 168px over two lines, so the type steps down as the name grows
 * rather than truncating a church out of its own name.
 */
function nameSize(name: string): React.CSSProperties {
  const length = name.trim().length;
  if (length <= 16) return { fontSize: 18, lineHeight: "22px" };
  if (length <= 30) return { fontSize: 15, lineHeight: "19px" };
  return { fontSize: 13, lineHeight: "17px" };
}

export function Sidebar({
  entries,
  churchName,
  personName,
  photoUrl,
  roleName,
  userId,
  church,
  logoUrl,
  collapsed: initial,
}: {
  entries: ShellEntry[];
  churchName: string;
  personName: string;
  /** R2.9. Their own face, when they have uploaded one. */
  photoUrl?: string | null;
  roleName: string;
  userId: string;
  church: string;
  /** R1.1. This church's own logo, where it has uploaded one. */
  logoUrl?: string | null;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(initial);
  const [going, setGoing] = React.useState(false);
  const reopen = useSectionMemory(entries);
  const forget = forgetSection;

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
        // Fixed to the window rather than scrolling with the page: the church's
        // mark stays at the top and signing out stays at the bottom, and only
        // the list of sections scrolls when a short screen cannot hold it.
        "sticky top-0 hidden h-screen shrink-0 flex-col gap-6 overflow-hidden",
        "border-r border-line bg-sunken md:flex",
        "motion-safe:transition-[width] motion-safe:duration-(--duration-base) motion-safe:ease-(--ease-out)",
        collapsed ? "w-16 px-2.5 py-5" : "w-58 px-3 py-5",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center",
          collapsed ? "flex-col gap-2" : "gap-2.5 pl-2",
        )}
      >
        <Link href="/choose-church" className="flex min-w-0 items-center gap-2.5" aria-label={churchName}>
          <FlameMark logoUrl={logoUrl} churchName={churchName} />
          {collapsed ? null : (
            <span
              className="min-w-0 flex-1 font-display font-semibold text-fg [overflow-wrap:anywhere] line-clamp-2"
              style={nameSize(churchName)}
            >
              {churchName}
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

      <nav
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto"
        aria-label={t("nav.sections")}
      >
        {entries.map((entry) => {
          const on = active === entry.href;
          const row = (
            <Link
              // R24.6. Back to the screen this section was left on.
              href={`${entry.href}?church=${church}`}
              // R24.6. Back to the screen this section was left on, decided on
              // the press so the rendered href is the same on both sides.
              onClick={(event) => {
                /*
                 * Pressing the section you are already in takes you to the top
                 * of it, which is the one way back out of a record without
                 * reaching for the back link. Pressing it from somewhere else
                 * returns you to where you left off.
                 */
                if (on) {
                  forget(entry.href);
                  return;
                }
                const back = reopen(entry.href);
                if (!back) return;
                event.preventDefault();
                router.push(back);
              }}
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
              {/* R24.6. The section being opened, while the server builds
                  it. Collapsed, the mark stands in for the icon's row. */}
              <Opening className="ml-auto" />
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

      <div className="flex shrink-0 flex-col gap-3">
        {/* Who is signed in, and the way to their own screen. It used to open
            Settings, which is its own row two inches above, and the chevrons
            promised a church switch it never made. */}
        <Link
          href={`/settings/profile?church=${church}`}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md text-left hover:bg-line",
            collapsed ? "justify-center p-1" : "px-1 py-2",
          )}
        >
          <Avatar name={personName} src={photoUrl} id={userId} size="sm" className="size-8 text-[12px] font-semibold" />
          {collapsed ? null : (
            <span className="flex min-w-0 flex-1 flex-col leading-4">
              <span className="truncate text-[13px] font-medium text-fg">{personName}</span>
              <span className="truncate text-[12px] text-fg-subtle">{roleName}</span>
            </span>
          )}
        </Link>

        {/* R24.6. Signing out forgets where every section was left, so the
            next person at this keyboard opens People on the directory rather
            than on a stranger's record. */}
        <form
          action="/auth/sign-out"
          method="post"
          className="contents"
          onSubmit={() => {
            setGoing(true);
            clearSectionMemory();
          }}
        >
          {/* The post navigates the whole page, so the wait is covered rather
              than left to the row that started it. */}
          <Working open={going} label={t("common.signingOut")} />
          <Tooltip content={t("action.signOut")} side="right">
            <button
              type="submit"
              disabled={going}
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
 * Four sections sit across the bar with More at the end, because a church
 * with giving, reports, forms and events has fourteen of them and the five
 * that fit were the only five a phone could reach. 6px of padding with the
 * safe area under it, 22px icons over an 11px label, the current one in the
 * accent at 600 and the rest subtle at 500.
 */
/** How many sections sit on the bar itself. The last place is More. */
const ON_BAR = 4;

export function MobileTabs({ entries, church }: { entries: ShellEntry[]; church: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const reopen = useSectionMemory(entries);
  const forget = forgetSection;
  const active = activeHref(entries, pathname);
  const [open, setOpen] = React.useState(false);

  /* Everything fits when there is nothing to put away. */
  const shown = entries.length <= ON_BAR + 1 ? entries : entries.slice(0, ON_BAR);
  const rest = entries.slice(shown.length);
  const inRest = rest.some((one) => one.href === active);

  const go = (entry: ShellEntry) => (event: React.MouseEvent) => {
    setOpen(false);
    // The same rule on a phone: the tab you are on goes to the top.
    if (entry.href === active) {
      forget(entry.href);
      return;
    }
    const back = reopen(entry.href);
    if (!back) return;
    event.preventDefault();
    router.push(back);
  };

  return (
    <>
      <nav
        aria-label={t("nav.sections")}
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-canvas px-1 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] md:hidden"
      >
        {shown.map((entry) => (
          <Tab
            key={entry.href}
            href={`${entry.href}?church=${church}`}
            icon={entry.icon}
            label={entry.label}
            on={active === entry.href}
            onClick={go(entry)}
          />
        ))}

        {rest.length > 0 ? (
          <Tab
            icon={<Menu aria-hidden />}
            label={t("nav.more")}
            on={inRest}
            onClick={() => setOpen(true)}
          />
        ) : null}
      </nav>

      {/* R24.6. The sections that did not fit, which on a phone is most of
          them. Nothing a church paid nothing for should be unreachable
          because somebody opened it on their phone. */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          title={t("nav.allSections")}
          closeLabel={t("common.close")}
          width="320px"
          className="md:hidden"
        >
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {entries.map((entry) => (
              <li key={entry.href}>
                <Link
                  href={`${entry.href}?church=${church}`}
                  onClick={go(entry)}
                  aria-current={active === entry.href ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-sm px-3 text-[15px] no-underline",
                    "[&_svg]:size-[20px] [&_svg]:shrink-0",
                    active === entry.href
                      ? "bg-primary-soft font-semibold text-primary"
                      : "font-medium text-fg hover:bg-sunken",
                  )}
                >
                  {entry.icon}
                  <span className="truncate">{entry.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}

/**
 * One place on the bar.
 *
 * `min-w-0` is what makes the label truncate rather than push the bar wider
 * than the screen, which is what "Celebrations" next to "Check-in" did.
 */
function Tab({
  href,
  icon,
  label,
  on,
  onClick,
}: {
  /** Left out by More, which opens a panel rather than going anywhere. */
  href?: string;
  icon: React.ReactNode;
  label: string;
  on: boolean;
  onClick: (event: React.MouseEvent) => void;
}) {
  const shape = cn(
    "flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col items-center gap-0.5 px-0.5 py-1.5",
    "text-[11px] no-underline",
    on ? "font-semibold text-primary" : "font-medium text-fg-subtle",
  );
  const inside = (
    <>
      <span className="grid place-items-center [&_svg]:size-[22px]">{icon}</span>
      <span className="w-full truncate text-center">{label}</span>
    </>
  );

  if (!href) {
    return (
      <button type="button" onClick={onClick} aria-expanded={on} className={shape}>
        {inside}
      </button>
    );
  }

  return (
    <Link href={href} onClick={onClick} aria-current={on ? "page" : undefined} className={shape}>
      {inside}
    </Link>
  );
}
