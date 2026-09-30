import * as React from "react";
import Link from "next/link";
import { cn } from "@hearth/ui";

/**
 * Three rising embers. The same mark as the favicon and the app icon.
 *
 * Drawn rather than imported so it inherits the accent token and changes with
 * the theme, and so it stays crisp at 20px on a header and 40px on a sign-in
 * page without a second asset.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("flex items-end gap-[0.1875em]", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[0.25em] rounded-full bg-accent"
          style={{ height: `${0.55 + i * 0.225}em`, opacity: 0.45 + i * 0.275 }}
        />
      ))}
    </span>
  );
}

/** The mark and the name. A link when there is somewhere sensible to go. */
export function Logo({
  href,
  size = "md",
  className,
}: {
  href?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const content = (
    <>
      <Mark className={size === "lg" ? "text-[2rem]" : "text-[1.35rem]"} />
      <span className={cn("font-display text-fg", size === "lg" ? "text-display" : "text-title")}>
        Hearth
      </span>
    </>
  );

  const shell = cn("inline-flex items-center", size === "lg" ? "gap-3" : "gap-2", className);

  return href ? (
    <Link href={href} className={cn(shell, "rounded-md")}>
      {content}
    </Link>
  ) : (
    <span className={shell}>{content}</span>
  );
}

/**
 * The bar on the pages that sit outside a church: sign in, choose a church,
 * start a church. The mark on the left, whatever the page needs on the right.
 */
export function BrandBar({ right }: { right?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
      <Logo href="/" />
      {right}
    </header>
  );
}
