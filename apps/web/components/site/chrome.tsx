import { ThemeDock } from "./theme-dock";
import type { Theme } from "@/app/(app)/settings/theme-actions";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Mark } from "@/components/brand";
import { SITE_BAR_CTA } from "./kit";

const NAV = [
  { href: "#why", key: "site.nav.why" },
  { href: "#features", key: "site.nav.features" },
  { href: "#checkin", key: "site.nav.checkin" },
  { href: "#pricing", key: "site.nav.pricing" },
] as const;

/** Where somebody who has decided starts. The one destination on the page. */
export const START = "/sign-up?next=/create-church";

/**
 * The bar every ConnectApp page carries: the mark and the name, top left, at one
 * size and in one place.
 *
 * Written once because it drifted. The website drew it at 22px in a 1200px row
 * and the trust page drew it at 17px in a 4px gutter, which is the kind of
 * difference a reader feels without being able to name.
 */
export function SiteBar({
  home = "/",
  children,
  nameFrom,
  topContent,
}: {
  /** Where the mark goes. The website keeps the reader on the page. */
  home?: string;
  /** Whatever the page hangs on the right of the bar. */
  children?: React.ReactNode;
  /** Content held above the bar while the page scrolls. */
  topContent?: React.ReactNode;
  /**
   * The width the name appears at, on a bar carrying enough beside it that a
   * narrow phone has no room for both. The mark stands alone below it and the
   * name stays in the accessibility tree, so the link keeps its words.
   */
  nameFrom?: "480px";
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-[color-mix(in_oklch,var(--canvas)_88%,transparent)] backdrop-blur-[10px]">
      {topContent}
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3 sm:gap-x-6">
        <Link
          href={home}
          className="flex min-h-11 min-w-0 shrink-0 items-center gap-2.5 rounded-md text-fg no-underline"
        >
          <Mark className="text-[1.5rem]" />
          <span
            className={
              nameFrom
                ? "sr-only font-display text-[22px] leading-7 min-[480px]:not-sr-only"
                : "font-display text-[19px] leading-7 sm:text-[22px]"
            }
          >
            {t("app.name")}
          </span>
        </Link>
        {children}
      </div>
    </header>
  );
}

/**
 * The bar at the top of the website: the mark, the sections, and the two things
 * a church can do.
 */
export function SiteHeader() {
  return (
    <SiteBar
      home="#top"
      nameFrom="480px"
      topContent={
        <div className="border-b border-line bg-primary-soft px-6 py-2.5">
          <div className="mx-auto flex min-h-11 max-w-[1200px] flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[15px] text-fg">
            <span>{t("site.pilot.banner")}</span>
            <Link
              href={START}
              className="inline-flex min-h-11 items-center rounded-md font-semibold text-primary underline underline-offset-4 hover:text-fg"
            >
              {t("site.pilot.join")}
            </Link>
          </div>
        </div>
      }
    >
      {/* On a phone the sections take a line of their own under the mark and
          scroll sideways. Wrapped into the bar they broke into two ragged rows
          with a word hanging off the end of each. */}
      <nav
        aria-label={t("site.nav.label")}
        className={
          "order-last -mx-6 flex w-full min-w-0 gap-1 overflow-x-auto px-6 "
          + "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden "
          + "md:order-none md:mx-0 md:w-auto md:flex-1 md:flex-wrap md:justify-center md:overflow-visible md:px-0"
        }
      >
        {NAV.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-lg px-2.5 text-[14px] font-medium text-fg-muted no-underline hover:bg-sunken hover:text-fg"
          >
            {t(item.key)}
          </a>
        ))}
      </nav>

      <div className="ml-auto flex flex-none items-center gap-2">
        <Button variant="ghost" className={SITE_BAR_CTA} asChild>
          <Link href="/sign-in">{t("home.signIn")}</Link>
        </Button>
        <Button className={SITE_BAR_CTA} asChild>
          <Link href={START}>
            {t("site.start")}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </SiteBar>
  );
}

const FOOT = [
  { href: "/trust", key: "site.foot.data" },
  { href: "https://github.com/boluwaji11/ConnectApp", key: "site.foot.source" },
  { href: "https://github.com/boluwaji11/ConnectApp/discussions", key: "site.foot.forum" },
  { href: "https://buy.stripe.com/dRmdR23AB9X2e7g6BV63K00", key: "site.foot.donate" },
  { href: "mailto:support@connectapp.church", key: "site.foot.supportEmail" },
] as const;

/** R21.12. The promises and the source, where somebody deciding can reach them. */
export function SiteFooter({ theme }: { theme?: Theme }) {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-x-10 gap-y-2 px-6 py-5">
        <Link href="/" className="flex min-h-11 items-center gap-2.5 rounded-md no-underline">
          <Mark className="text-[1.15rem]" />
          <span className="font-display text-[18px] leading-6 text-fg">{t("app.name")}</span>
        </Link>
        {/* 44px a row on a phone, where these are the only links on the screen
            somebody is reaching for with a thumb. */}
        <nav aria-label={t("site.foot.label")} className="flex flex-wrap gap-x-6 text-[14px]">
          {FOOT.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              target={item.key === "site.foot.donate" ? "_blank" : undefined}
              rel={item.key === "site.foot.donate" ? "noopener noreferrer" : undefined}
              className={`flex min-h-11 items-center text-fg-muted hover:text-fg sm:min-h-0 ${
                item.key === "site.foot.supportEmail" ? "underline underline-offset-4" : "no-underline"
              }`}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        {/* R24.x. Light, dark, or whatever the device is set to. It sits with
            the rest of the small print rather than riding over the page. */}
        {theme ? <ThemeDock current={theme} /> : null}
      </div>
    </footer>
  );
}
