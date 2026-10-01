"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@hearth/ui";

/**
 * One link in the header, and whether it is the screen you are on.
 *
 * Seven links with nothing marking the current one is seven links a person has
 * to read every time to work out where they are. Both tab bars in the product
 * already do this; the main navigation did not.
 */
export function NavLink({
  href,
  church,
  label,
}: {
  href: string;
  church: string;
  label: string;
}) {
  const pathname = usePathname();
  const here = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={`${href}?church=${church}`}
      aria-current={here ? "page" : undefined}
      className={cn(
        "rounded-md px-2.5 py-1 text-label transition-colors duration-instant",
        here ? "bg-sunken font-medium text-fg" : "text-fg-muted hover:bg-sunken hover:text-fg",
      )}
    >
      {label}
    </Link>
  );
}
