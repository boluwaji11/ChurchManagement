"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@hearth/ui";
import { t } from "@hearth/i18n";

export interface SettingsTab {
  href: string;
  label: string;
}

/**
 * One row of real links rather than a client tab widget.
 *
 * Each section is a page, so it can be linked to, opened in a new tab and
 * reloaded on the one it was on. A widget that swaps panels loses all three and
 * gains nothing.
 */
export function SettingsTabs({ tabs, church }: { tabs: SettingsTab[]; church: string }) {
  const pathname = usePathname();

  return (
    <nav className="mb-8 flex flex-wrap gap-1 border-b border-line" aria-label={t("settings.sections")}>
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={`${tab.href}?church=${church}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-label transition-colors duration-instant",
              active
                ? "border-primary text-primary"
                : "border-transparent text-fg-muted hover:border-line-strong hover:text-fg",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
