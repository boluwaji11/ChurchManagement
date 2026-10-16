/**
 * HRT-381, R22.2, R17.1. The bar across the top of every page of a church's
 * website, and the one across the bottom.
 *
 * Both are shared: a church changes them once and every page follows. Both
 * render with no JavaScript at all, the mobile menu included, because the
 * published page is read by somebody on a phone on a slow connection who is
 * deciding whether to visit on the weekend.
 */

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { t } from "@connectapp/i18n";
import { navPages } from "@connectapp/db/rules";
import {
  Btn, BODY, DISPLAY, Inner, P, dayName, hrefFor, marks, mediaUrl,
  richIsEmpty, timeLabel, type SiteCtx,
} from "./kit";

const NAV_LINK =
  "font-[family-name:var(--s-body)] text-[0.95rem] font-medium no-underline"
  + " text-current/85 transition-opacity hover:opacity-70"
  + " focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
  + " focus-visible:outline-current";

function PageLinks({ site, className }: { site: SiteCtx; className?: string }) {
  const pages = navPages(site.doc);
  return (
    <>
      {pages.map((page) => {
        const href = page.id === site.doc.homeId ? "/" : `/${page.slug}`;
        return site.editing ? (
          <span key={page.id} className={`${NAV_LINK} ${className ?? ""}`}>{page.title}</span>
        ) : (
          <Link key={page.id} href={href} className={`${NAV_LINK} ${className ?? ""}`}>
            {page.title}
          </Link>
        );
      })}
    </>
  );
}

/** The church's mark, or its name where there is no mark. */
function Mark({ site, centred }: { site: SiteCtx; centred?: boolean }) {
  const logo = site.doc.header.logo ?? site.logo;
  const name = site.doc.header.showName || !logo;
  const inner = (
    <span className={`flex min-w-0 items-center gap-3 ${centred ? "flex-col gap-2" : ""}`}>
      {logo ? (
        /* eslint-disable-next-line @next/next/no-img-element -- the church's
           own mark, served through /site-media with its own caching; next/image
           would proxy a signed redirect it cannot cache. */
        <img
          src={mediaUrl(logo) ?? ""}
          alt={logo.alt || site.name}
          className="h-10 w-auto max-w-[200px] object-contain sm:h-11"
          {...marks(site.editing, "header.logo", "image")}
        />
      ) : null}
      {name ? (
        <span
          className={`${DISPLAY} truncate text-[1.18rem] leading-tight sm:text-[1.3rem]`}
        >
          {site.name}
        </span>
      ) : null}
    </span>
  );
  return site.editing
    ? <span className="no-underline">{inner}</span>
    : <Link href="/" className="no-underline">{inner}</Link>;
}

export function SiteHeaderView({ site }: { site: SiteCtx }) {
  const { header } = site.doc;
  const pages = navPages(site.doc);
  const action = header.action;

  /*
   * A transparent bar sits over the hero and takes its colour from the picture
   * behind it, so it is only drawn that way on a page whose first section can
   * carry it. Anywhere else it would be white words on a white ground.
   */
  const ground = header.transparent
    ? "absolute inset-x-0 top-0 z-30 bg-transparent text-white"
    : "relative bg-[var(--s-surface)] text-[var(--s-ink)] border-b border-[var(--s-line)]";
  const stick = header.sticky && !header.transparent ? "sticky top-0 z-30" : "";

  const menu = pages.length > 1 ? (
    /* No JavaScript: a disclosure the browser owns, which opens with a keyboard
       and closes when it loses focus. */
    <details className="group relative lg:hidden [&_summary::-webkit-details-marker]:hidden">
      <summary
        className={
          "flex cursor-pointer list-none items-center gap-2 rounded-[var(--s-button-corner)]"
          + " border border-current/25 px-3 py-2 font-[family-name:var(--s-body)]"
          + " text-sm font-semibold focus-visible:outline focus-visible:outline-2"
          + " focus-visible:outline-offset-2 focus-visible:outline-current"
        }
      >
        <Menu className="size-4" aria-hidden />
        {t("website.menu")}
      </summary>
      <nav
        aria-label={site.name}
        className={
          "absolute right-0 top-[calc(100%+8px)] z-40 flex w-[min(78vw,280px)] flex-col gap-1"
          + " rounded-[var(--s-corner)] border border-[var(--s-line)] bg-[var(--s-surface)]"
          + " p-2 text-[var(--s-ink)] shadow-[0_24px_48px_-24px_rgba(16,14,12,0.4)]"
        }
      >
        <PageLinks site={site} className="rounded-[10px] px-3 py-2.5 hover:bg-[var(--s-primary-soft)]" />
      </nav>
    </details>
  ) : null;

  const inner = {
    logoLeft: (
      <div className="flex items-center justify-between gap-5 py-4">
        <Mark site={site} />
        <div className="flex items-center gap-5">
          <nav aria-label={site.name} className="hidden items-center gap-6 lg:flex">
            <PageLinks site={site} />
          </nav>
          {action ? <Btn value={action} at="header.action" site={site} className="hidden sm:inline-flex" /> : null}
          {menu}
        </div>
      </div>
    ),
    centred: (
      <div className="flex flex-col items-center gap-3 py-5">
        <div className="flex w-full items-center justify-between lg:hidden">
          <Mark site={site} />
          {menu}
        </div>
        <div className="hidden flex-col items-center gap-3 lg:flex">
          <Mark site={site} centred />
          <nav aria-label={site.name} className="flex items-center gap-7">
            <PageLinks site={site} />
            {action ? <Btn value={action} at="header.action" site={site} tone="quiet" /> : null}
          </nav>
        </div>
      </div>
    ),
    minimal: (
      <div className="flex items-center justify-between gap-5 py-4">
        <Mark site={site} />
        <div className="flex items-center gap-4">
          {action ? <Btn value={action} at="header.action" site={site} /> : null}
          {menu}
        </div>
      </div>
    ),
    stacked: (
      <div className="flex flex-col gap-3 py-4">
        <div className="flex items-center justify-between gap-4">
          <Mark site={site} />
          <div className="flex items-center gap-3">
            {action ? <Btn value={action} at="header.action" site={site} className="hidden sm:inline-flex" /> : null}
            {menu}
          </div>
        </div>
        <nav
          aria-label={site.name}
          className="hidden items-center gap-6 border-t border-current/15 pt-3 lg:flex"
        >
          <PageLinks site={site} />
        </nav>
      </div>
    ),
  }[header.style];

  return (
    <header className={`${ground} ${stick}`} {...marks(site.editing, "header", "header")}>
      <Inner wide>{inner}</Inner>
    </header>
  );
}

/* ------------------------------------------------------------- the footer --- */

const FOOT_HEAD =
  "m-0 font-[family-name:var(--s-body)] text-[0.78rem] font-semibold uppercase"
  + " tracking-[0.16em] opacity-70";

function Lines({ site }: { site: SiteCtx }) {
  const { address } = site;
  const parts = [
    address.line1,
    address.line2,
    [address.city, address.region].filter(Boolean).join(", "),
    address.postalCode,
  ].filter((one): one is string => Boolean(one && one.trim()));
  if (parts.length === 0) return null;
  return (
    <address className={`${BODY} m-0 not-italic opacity-80`}>
      {parts.map((part) => <span key={part} className="block">{part}</span>)}
    </address>
  );
}

function Reach({ site }: { site: SiteCtx }) {
  const email = hrefFor(site, { kind: "email" });
  const phone = hrefFor(site, { kind: "phone" });
  if (!email && !phone) return null;
  const look = `${BODY} no-underline opacity-80 hover:opacity-100`;
  return (
    <div className="flex flex-col gap-1.5">
      {email ? (
        site.editing
          ? <span className={look}>{site.email}</span>
          : <a href={email} className={look}>{site.email}</a>
      ) : null}
      {phone ? (
        site.editing
          ? <span className={look}>{site.phone}</span>
          : <a href={phone} className={look}>{site.phone}</a>
      ) : null}
    </div>
  );
}

function Times({ site }: { site: SiteCtx }) {
  if (site.data.services.length === 0) return null;
  return (
    <ul className={`${BODY} m-0 flex list-none flex-col gap-1.5 p-0 opacity-80`}>
      {site.data.services.slice(0, 4).map((one, index) => (
        <li key={`${one.name}-${one.dayOfWeek}-${one.startsAt}-${index}`}>
          {t("website.part.serviceAt", {
            day: dayName(one.dayOfWeek, site.country),
            time: timeLabel(one.startsAt, site.country),
          })}
        </li>
      ))}
    </ul>
  );
}

function Social({ site }: { site: SiteCtx }) {
  const entries = Object.entries(site.doc.social).filter(([, url]) => Boolean(url));
  if (entries.length === 0) return null;
  const look =
    `${BODY} capitalize no-underline opacity-80 hover:opacity-100`;
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {entries.map(([name, url]) => site.editing ? (
        <span key={name} className={look}>{name}</span>
      ) : (
        <a key={name} href={url as string} target="_blank" rel="noopener noreferrer" className={look}>
          {name}
        </a>
      ))}
    </div>
  );
}

export function SiteFooterView({ site }: { site: SiteCtx }) {
  const { footer } = site.doc;
  const year = new Date().getFullYear();
  const blurb = footer.blurb;

  type Column = { key: string; head: string; body: React.ReactNode };
  const columns: Column[] = ([
    footer.showAddress ? { key: "where", head: t("website.part.where"), body: <Lines site={site} /> } : null,
    footer.showContact ? { key: "reach", head: t("website.foot.contact"), body: <Reach site={site} /> } : null,
    footer.showTimes ? { key: "times", head: t("website.ph.times.title"), body: <Times site={site} /> } : null,
    footer.showSocial ? { key: "social", head: t("website.ph.social.title"), body: <Social site={site} /> } : null,
  ] as (Column | null)[]).filter((one): one is Column => one !== null && one.body !== null);

  const quick = footer.links.length > 0 ? (
    <div className="flex flex-col gap-2">
      <p className={FOOT_HEAD}>{t("website.foot.links")}</p>
      <div className="flex flex-col items-start gap-1.5">
        {footer.links.map((one, index) => (
          <Btn key={index} value={one} at={`footer.links.${index}`} site={site} tone="quiet" />
        ))}
      </div>
    </div>
  ) : null;

  const mark = (
    <div className="flex flex-col gap-3">
      <p className={`${DISPLAY} m-0 text-[1.25rem]`}>{site.name}</p>
      {richIsEmpty(blurb) && !site.editing ? null : (
        <P
          value={blurb}
          at="footer.blurb"
          site={site}
          className={`${BODY} max-w-[42ch] opacity-80`}
          placeholder={t("website.ph.footer.blurb")}
        />
      )}
    </div>
  );

  const bottom = (
    <div
      className={
        `${BODY} flex flex-col gap-2 border-t border-current/15 pt-5 text-[0.85rem]`
        + " opacity-70 sm:flex-row sm:items-center sm:justify-between"
      }
    >
      <span>{t("website.foot.rights", { year: String(year), church: site.name })}</span>
      {site.editing ? (
        <span>{t("website.foot.builtWith")}</span>
      ) : (
        <a
          href="https://connectapp.church"
          className="no-underline hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("website.foot.builtWith")}
        </a>
      )}
    </div>
  );

  const ground = footer.style === "band"
    ? "bg-[var(--s-primary)] text-[var(--s-primary-ink)]"
    : footer.style === "simple"
      ? "bg-[var(--s-bg)] text-[var(--s-ink)] border-t border-[var(--s-line)]"
      : "bg-[var(--s-surface)] text-[var(--s-ink)] border-t border-[var(--s-line)]";

  return (
    <footer className={ground} {...marks(site.editing, "footer", "footer")}>
      <Inner wide className="flex flex-col gap-10 py-12 sm:py-14">
        {footer.style === "simple" ? (
          <div className="flex flex-col items-center gap-5 text-center">
            {mark}
            <Social site={site} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(auto-fit,minmax(0,1fr))]">
            {mark}
            {columns.map((column) => (
              <div key={column.key} className="flex flex-col gap-2.5">
                <p className={FOOT_HEAD}>{column.head}</p>
                {column.body}
              </div>
            ))}
            {quick}
          </div>
        )}
        {bottom}
      </Inner>
    </footer>
  );
}
