import * as React from "react";
import Link from "next/link";

/**
 * R24.6. One of the three panels under the tiles.
 *
 * A Fraunces heading, one quiet thing on the right, and whatever the panel is
 * for underneath. Written once so the three cannot drift apart.
 */
export function Panel({
  title,
  aside,
  link,
  children,
}: {
  title: string;
  aside?: string;
  link?: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-[14px] border border-line bg-surface p-5">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[22px] leading-7 text-fg">{title}</h2>
        {link ? (
          <Link
            href={link.href}
            className="-my-1.5 inline-flex items-center py-1.5 text-[13px] font-medium text-primary"
          >
            {link.label}
          </Link>
        ) : aside ? (
          <span className="text-caption text-fg-subtle">{aside}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}
