"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@hearth/ui";
import { t } from "@hearth/i18n";

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
 * R24.6. The settings menu down the left, as the design draws it.
 *
 * Real links rather than a tab widget: each section is a page, so it can be
 * linked to, opened in its own tab and reloaded on the one it was on.
 *
 * Grouped, because a church opening settings is looking for one of five things,
 * and twelve names in a row is a list somebody reads twice.
 */
export function SettingsNav({ groups, church }: { groups: SettingsGroup[]; church: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("settings.sections")}
      className="flex max-w-50 flex-[1_1_160px] flex-col gap-3.5"
    >
      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-0.5">
          <span className="px-2.5 pb-1 text-[11px] font-bold tracking-wide text-fg uppercase">
            {group.title}
          </span>

          {group.items.map((item) => {
            const on = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={`${item.href}?church=${church}`}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex min-h-9 items-center rounded-sm px-2.5 text-left text-[length:var(--d-text-body)]",
                  on
                    ? "bg-line font-semibold text-fg"
                    : "font-medium text-fg-muted hover:bg-line hover:text-fg",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
