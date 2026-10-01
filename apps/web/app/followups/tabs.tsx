"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@hearth/ui";
import { t } from "@hearth/i18n";

/** R5.5, R5.7. Mine, and the church's. Two real pages rather than a widget. */
export function FollowUpTabs({ church }: { church: string }) {
  const pathname = usePathname();

  const tabs = [
    { href: "/followups", label: t("queue.mine") },
    { href: "/followups/board", label: t("queue.board") },
  ];

  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-line" aria-label={t("queue.title")}>
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
