import * as React from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import { cn } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * Three rising embers. The same mark as the favicon and the app icon.
 *
 * Drawn rather than imported so it inherits the primary token and changes with
 * the theme, and so it stays crisp at 20px on a header and 40px on a sign-in
 * page without a second asset.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("flex items-end gap-[0.1875em]", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[0.25em] rounded-full bg-primary"
          style={{ height: `${0.55 + i * 0.225}em`, opacity: 0.45 + i * 0.275 }}
        />
      ))}
    </span>
  );
}

/**
 * The mark as the redesign draws it: a flame on an ember square.
 *
 * Used in the app chrome, where the sidebar and the top bar carry it at two
 * sizes. 32px with a 10px radius down the side, 28px with an 8px radius in the
 * top bar on a phone.
 */
export function FlameMark({
  size = 32,
  logoUrl,
  churchName,
}: {
  size?: 32 | 28;
  logoUrl?: string | null;
  /** R1.1. Whose church this is, for the letter shown until there is a logo. */
  churchName?: string | null;
}) {
  const box = {
    width: size,
    height: size,
    borderRadius: size === 32 ? 10 : 8,
  } as const;

  /*
   * R1.1. A church that has uploaded a logo sees its own logo here, on every
   * screen, rather than ours. Contained rather than cropped, because a wordmark
   * and a round crest both have to survive a 32px square.
   */
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        aria-hidden
        className="shrink-0 border border-line bg-surface object-contain p-0.5"
        style={box}
      />
    );
  }

  /*
   * R1.1. The church's own first letter until there is a logo, which is what
   * the settings screen already draws and what a printed label falls back to.
   * Our flame in the corner of their software says whose product it is, which
   * is not the question that corner answers.
   */
  const letter = churchName?.trim().charAt(0).toUpperCase();
  if (letter) {
    return (
      <span
        aria-hidden
        className="grid shrink-0 place-items-center bg-primary font-display text-primary-fg"
        style={{ ...box, fontSize: size === 32 ? 17 : 15 }}
      >
        {letter}
      </span>
    );
  }

  return (
    <span aria-hidden className="grid shrink-0 place-items-center bg-primary text-primary-fg" style={box}>
      <Flame style={{ width: size === 32 ? 16 : 14, height: size === 32 ? 16 : 14 }} />
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
        {t("app.name")}
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
