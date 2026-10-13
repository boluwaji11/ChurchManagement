"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  PanelLeftClose, PanelLeftOpen, LogOut, Menu,
  LayoutDashboard, Users, CalendarDays, Church, Settings as Cog,
} from "lucide-react";
import { Avatar, Sheet, SheetContent, Tooltip, Working, cn } from "@connectapp/ui";
import { t, type MessageKey } from "@connectapp/i18n";
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

const SIDEBAR_GROUPS: {
  id: string;
  label: MessageKey;
  /** The rail is icons, so an area needs a mark of its own. */
  icon: React.ComponentType<{ className?: string }>;
  hrefs: readonly string[];
}[] = [
  { id: "workspace", label: "nav.group.workspace", icon: LayoutDashboard, hrefs: ["/dashboard", "/home"] },
  {
    id: "people",
    label: "nav.group.people",
    icon: Users,
    hrefs: ["/members", "/directory", "/messages", "/followups", "/groups"],
  },
  {
    id: "gatherings",
    label: "nav.group.gatherings",
    icon: CalendarDays,
    hrefs: ["/checkin", "/calendar", "/services", "/schedule", "/events"],
  },
  {
    id: "church",
    label: "nav.group.church",
    icon: Church,
    hrefs: ["/giving", "/forms", "/website", "/reports"],
  },
] as const;

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
  const groups = SIDEBAR_GROUPS.map((group) => ({
    ...group,
    entries: entries.filter((entry) => group.hrefs.includes(entry.href)),
  })).filter((group) => group.entries.length > 0);
  const settings = entries.filter((entry) => entry.href.startsWith("/settings"));
  const groupedHrefs = new Set<string>([
    ...SIDEBAR_GROUPS.flatMap((group) => group.hrefs),
    ...settings.map((entry) => entry.href),
  ]);
  const otherEntries = entries.filter((entry) => !groupedHrefs.has(entry.href));
  const activeGroup = groups.find((group) =>
    group.entries.some((entry) => entry.href === active),
  )?.id ?? null;

  /*
   * R24.14. Which area the second column is showing.
   *
   * It follows the route, and a press on the rail moves it somewhere else
   * without navigating, so somebody can look into Gatherings while standing on
   * a member's record and go back by pressing nothing. There is no accordion
   * and nothing to remember being open: the area a reader is in is a fact
   * about where they are rather than a preference they set.
   */
  const [shown, setShown] = React.useState<string | null>(activeGroup ?? groups[0]?.id ?? null);
  React.useEffect(() => {
    if (activeGroup) setShown(activeGroup);
  }, [activeGroup]);

  const area = groups.find((group) => group.id === shown) ?? groups[0];
  /*
   * Settings sits on the rail rather than in an area, so while somebody is in
   * it no area is the one they are in. Without this the rail went on showing
   * Overview as chosen on every settings screen.
   */
  const onSettings = settings.some((entry) => entry.href === active);
  /*
   * R24.14. An area with one screen in it draws no second column. Overview is
   * the Dashboard and nothing else, and a column holding a single row below a
   * heading naming the same thing is a list of one.
   */
  const items = area?.entries ?? [];
  const listed = items.length > 1 || otherEntries.length > 0;
  const open = !collapsed && listed;

  const renderEntry = (entry: ShellEntry) => {
    const on = active === entry.href;
    const row = (
      <Link
        href={`${entry.href}`}
        onClick={(event) => {
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
          "relative flex h-9 w-full items-center gap-2.5 rounded-lg text-left text-[13px] font-medium",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
          collapsed ? "justify-center px-0" : "px-2.5",
          on
            ? "bg-surface font-semibold text-fg shadow-sm"
            : "text-shell-muted hover:bg-shell-line hover:text-shell-fg",
        )}
      >
        <span className="grid shrink-0 place-items-center [&_svg]:size-[18px]">
          {entry.icon}
        </span>
        {collapsed ? null : <span className="truncate whitespace-nowrap">{entry.label}</span>}
        <Opening className="ml-auto" />
      </Link>
    );
    return collapsed ? (
      <Tooltip key={entry.href} content={entry.label} side="right">{row}</Tooltip>
    ) : <React.Fragment key={entry.href}>{row}</React.Fragment>;
  };

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    void setSidebarCollapsed(next);
  };

  /*
   * R24.14. Pressing an area shows it, which means showing what is in it.
   * Switching area with the column shut moved the mark on the rail and left
   * the items where they could not be seen, so the only way to read the area
   * somebody had just chosen was to find the reopen control.
   */
  const openColumn = () => {
    if (!collapsed) return;
    setCollapsed(false);
    void setSidebarCollapsed(false);
  };

  const toggleLabel = collapsed ? t("shell.expand") : t("shell.collapse");

  return (
    <div className="sticky top-0 hidden h-screen shrink-0 md:flex">
      {/*
        R24.14. The rail. One mark per area, the church at the top and the
        person at the bottom, 64px wide and never collapsing.

        The navigation used to be four groups stacked in one 232px column as an
        accordion, where opening one closed another and `section-memory` kept
        track of where each had been left. That is a two level navigation
        crammed into one level, and the accordion was the apology for it. Two
        levels drawn as two columns needs no apology and nothing remembered.
      */}
      <aside
        aria-label={t("nav.areas")}
        className={cn(
          "flex w-16 shrink-0 flex-col items-center gap-5 overflow-hidden",
          "border-r border-shell-line bg-shell text-shell-fg px-2 py-5",
        )}
      >
        <Link
          href="/choose-church"
          className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={churchName}
        >
          <FlameMark logoUrl={logoUrl} churchName={churchName} />
        </Link>

        {/* The one control that opens and shuts the second column, on the half
            that never shuts. It used to float over the page beside the rail,
            where the sticky header covered it: the column could be closed and
            then never reopened. */}
        {/* Shutting the column is done inside it. Opening it again cannot be,
            so the rail carries that half and only that half. On an area holding
            one screen there is no column either way and neither is drawn. */}
        {listed && collapsed ? (
          <Tooltip content={toggleLabel} side="right">
            <button
              type="button"
              onClick={toggle}
              aria-label={toggleLabel}
              aria-expanded={false}
              className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-shell-muted hover:bg-shell-line hover:text-shell-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <PanelLeftOpen className="size-[18px]" />
            </button>
          </Tooltip>
        ) : null}

        <nav className="scroll-quiet flex min-h-0 flex-1 flex-col items-center gap-2.5 overflow-y-auto">
          {groups.map((group) => {
            const Mark = group.icon;
            const here = group.id === activeGroup;
            const looking = group.id === shown && !onSettings;
            return (
              <Tooltip key={group.id} content={t(group.label as never)} side="right">
                <button
                  type="button"
                  onClick={() => {
                    setShown(group.id);
                    openColumn();
                    /* R24.14. Into the area, at its first screen. Switching the
                       column and leaving the reader on the screen they were
                       already on puts the rail, the column and the page in
                       three different places at once. */
                    const first = group.entries[0];
                    if (first) router.push(first.href);
                  }}
                  aria-current={here ? "true" : undefined}
                  aria-pressed={looking}
                  className={cn(
                    "flex w-11 shrink-0 cursor-pointer flex-col items-center gap-2.5 rounded-2xl py-3",
                    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
                    looking
                      ? "bg-surface text-fg shadow-sm"
                      : "text-shell-muted hover:bg-shell-line hover:text-shell-fg",
                  )}
                >
                  <Mark className="size-[19px] shrink-0" />
                  {/* The one being looked at says its name down the rail, which
                      is what makes the rail readable without a tooltip. */}
                  {looking ? (
                    <span className="[writing-mode:vertical-rl] rotate-180 text-[13px] font-semibold uppercase tracking-[0.1em]">
                      {t(group.label as never)}
                    </span>
                  ) : null}
                </button>
              </Tooltip>
            );
          })}
        </nav>

        <div className="flex shrink-0 flex-col items-center gap-3 border-t border-shell-line pt-4">
          {settings.map((entry) => {
            const on = active === entry.href;
            return (
              <Tooltip key={entry.href} content={entry.label} side="right">
                <Link
                  href={entry.href}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "flex w-11 shrink-0 flex-col items-center gap-2.5 rounded-2xl py-3 no-underline",
                    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
                    on
                      ? "bg-surface text-fg shadow-sm"
                      : "text-shell-muted hover:bg-shell-line hover:text-shell-fg",
                  )}
                >
                  <Cog className="size-[19px] shrink-0" aria-hidden />
                  {/* The same shape the areas take, so the rail reads the same
                      way wherever somebody is standing on it. */}
                  {on ? (
                    <span className="[writing-mode:vertical-rl] rotate-180 text-[13px] font-semibold uppercase tracking-[0.1em]">
                      {entry.label}
                    </span>
                  ) : null}
                </Link>
              </Tooltip>
            );
          })}

          {/* The role rode under the name in the old footer. The rail has room
              for a face and nothing else, so it moves into the tooltip rather
              than being dropped. */}
          <Tooltip content={`${personName}, ${roleName}`} side="right">
            <Link href={"/settings/profile"} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80">
              <Avatar name={personName} src={photoUrl} id={userId} size="sm" className="size-8 text-[12px] font-semibold" />
            </Link>
          </Tooltip>

          {/* R24.6. Signing out forgets where every section was left, so the
              next person at this keyboard opens People on the directory rather
              than on a stranger's record. */}
          <form
            action="/auth/sign-out"
            method="post"
            onSubmit={() => { setGoing(true); clearSectionMemory(); }}
          >
            <Working open={going} label={t("common.signingOut")} />
            <Tooltip content={t("action.signOut")} side="right">
              <button
                type="submit"
                disabled={going}
                aria-label={t("action.signOut")}
                className="grid size-9 cursor-pointer place-items-center rounded-lg text-shell-muted hover:bg-shell-line hover:text-shell-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                <LogOut className="size-[18px]" aria-hidden />
              </button>
            </Tooltip>
          </form>
        </div>
      </aside>

      {/* The area's own items. This is the half that collapses, because a
          schedule grid wants the width and the rail costs nothing. */}
      <aside
        aria-label={t("nav.sections")}
        className={cn(
          "flex h-screen flex-col gap-3 overflow-hidden border-r border-shell-line bg-shell text-shell-fg",
          "motion-safe:transition-[width] motion-safe:duration-(--duration-base) motion-safe:ease-(--ease-out)",
          open ? "w-52 px-3 py-4" : "w-0 border-r-0",
        )}
      >
        {open ? (
          <>
            <div className="flex shrink-0 items-start justify-between gap-2 px-1">
              <span
                className="min-w-0 flex-1 font-display font-semibold text-shell-fg [overflow-wrap:anywhere] line-clamp-2"
                style={nameSize(churchName)}
              >
                {churchName}
              </span>
              <Tooltip content={toggleLabel} side="right">
                <button
                  type="button"
                  onClick={toggle}
                  aria-label={toggleLabel}
                  aria-expanded
                  className="grid size-[30px] shrink-0 cursor-pointer place-items-center rounded-md text-shell-muted hover:bg-shell-line hover:text-shell-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                >
                  <PanelLeftClose className="size-[18px]" />
                </button>
              </Tooltip>
            </div>

            <nav className="scroll-quiet flex min-h-0 flex-1 flex-col gap-1.5 overflow-x-hidden overflow-y-auto">
              {area?.entries.map(renderEntry)}

              {/* Anything no area claims. Settings is on the rail, so this is
                  usually empty and draws nothing when it is. */}
              {otherEntries.length ? (
                <>
                  <span className="mt-3 px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-shell-muted">
                    {t("nav.group.more")}
                  </span>
                  {otherEntries.map(renderEntry)}
                </>
              ) : null}
            </nav>
          </>
        ) : null}
      </aside>

    </div>
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

export function MobileTabs({ entries }: { entries: ShellEntry[]}) {
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
            href={`${entry.href}`}
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
                  href={`${entry.href}`}
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
