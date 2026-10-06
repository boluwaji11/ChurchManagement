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
}: {
  /** Where the mark goes. The website keeps the reader on the page. */
  home?: string;
  /** Whatever the page hangs on the right of the bar. */
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-[color-mix(in_oklch,var(--canvas)_88%,transparent)] backdrop-blur-[10px]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-6 px-6 py-3">
        <Link href={home} className="flex items-center gap-2.5 rounded-md text-fg no-underline">
          <Mark className="text-[1.5rem]" />
          <span className="font-display text-[22px] leading-7">{t("app.name")}</span>
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
    <SiteBar home="#top">
      <nav aria-label={t("site.nav.label")} className="flex min-w-0 flex-1 flex-wrap justify-center gap-1">
        {NAV.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-lg px-2.5 py-1.5 text-[14px] font-medium text-fg-muted no-underline hover:bg-sunken hover:text-fg"
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
  { href: "https://github.com/boluwaji11/ChurchManagement", key: "site.foot.source" },
  { href: "https://github.com/boluwaji11/ChurchManagement/discussions", key: "site.foot.forum" },
  { href: "https://github.com/sponsors/boluwaji11", key: "site.foot.donate" },
] as const;

/** R21.12. The promises and the source, where somebody deciding can reach them. */
export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-x-10 gap-y-3 px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5 rounded-md no-underline">
          <Mark className="text-[1.15rem]" />
          <span className="font-display text-[18px] leading-6 text-fg">{t("app.name")}</span>
        </Link>
        <nav aria-label={t("site.foot.label")} className="flex flex-wrap gap-x-6 gap-y-1.5 text-[14px]">
          {FOOT.map((item) => (
            <Link key={item.key} href={item.href} className="text-fg-muted no-underline hover:text-fg">
              {t(item.key)}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
