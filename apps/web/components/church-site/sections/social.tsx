/**
 * HRT-379, R22.2. Where else this church can be found.
 *
 * Reads the addresses the church gave in the website's own settings, each one
 * already checked to belong to the service it is filed under, and draws one
 * mark per address it holds. An address the church left blank leaves the row.
 *
 * Lucide has a mark for Facebook, Instagram and YouTube. It has none for X or
 * TikTok, so those two are drawn as their own short label: a wrong icon reads
 * as a different company, and a word nobody can mistake is better than that.
 */

import * as React from "react";
import { Facebook, Instagram, Music, Youtube } from "lucide-react";
import type { SiteSocial } from "@connectapp/db/rules";
import { t } from "@connectapp/i18n";
import { Band, Head, Inner, NothingYet, type SiteCtx } from "../kit";
import type { SectionViewProps } from "../section-props";

/* ---------------------------------------------------------- the services --- */

type Mark = {
  key: keyof SiteSocial;
  /** The service's own name, which is a trade name rather than copy. */
  name: string;
  icon: React.ComponentType<{ className?: string }> | null;
};

const MARKS: readonly Mark[] = [
  { key: "facebook", name: "Facebook", icon: Facebook },
  { key: "instagram", name: "Instagram", icon: Instagram },
  { key: "youtube", name: "YouTube", icon: Youtube },
  { key: "x", name: "X", icon: null },
  { key: "tiktok", name: "TikTok", icon: null },
  { key: "spotify", name: "Spotify", icon: Music },
];

export interface SocialMark {
  key: string;
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }> | null;
}

/** The addresses this church actually gave, in the order they are drawn. */
export function socialMarks(social: SiteSocial): SocialMark[] {
  const out: SocialMark[] = [];
  for (const mark of MARKS) {
    const href = social[mark.key];
    if (typeof href === "string" && href.trim()) {
      out.push({ key: mark.key, name: mark.name, href: href.trim(), icon: mark.icon });
    }
  }
  return out;
}

/* ------------------------------------------------------------- one mark --- */

const SHELL =
  "inline-flex items-center justify-center gap-2 rounded-[var(--s-button-corner)]"
  + " border border-[var(--s-line)] bg-[var(--s-surface)] text-[var(--s-ink)]"
  + " no-underline transition-colors duration-150 hover:border-[var(--s-primary)]"
  + " hover:text-[var(--s-primary)] focus-visible:outline focus-visible:outline-2"
  + " focus-visible:outline-offset-2 focus-visible:outline-[var(--s-primary)]";

const WORD =
  "font-[family-name:var(--s-body)] text-[0.95rem] font-semibold leading-none";

/**
 * One address, as a mark or as its own name.
 *
 * Inside the editor's canvas it is a span, so a church arranging its page does
 * not get taken off to Instagram by a stray press.
 */
function MarkView({
  mark,
  site,
  size,
}: {
  mark: SocialMark;
  site: SiteCtx;
  size: "regular" | "large";
}) {
  const box = size === "large" ? "size-14 text-[1.05rem]" : "size-11";
  const pad = size === "large" ? "h-14 px-5" : "h-11 px-4";
  const glyph = size === "large" ? "size-6" : "size-5";
  const Icon = mark.icon;

  const look = `${SHELL} ${Icon ? box : pad}`;
  const inside = Icon ? (
    <>
      <Icon className={glyph} aria-hidden />
      <span className="sr-only">{mark.name}</span>
    </>
  ) : (
    <span className={WORD}>{mark.name}</span>
  );

  if (site.editing) {
    return (
      <span className={look} {...(Icon ? { "aria-label": mark.name } : {})}>
        {inside}
      </span>
    );
  }
  return (
    <a
      href={mark.href}
      className={look}
      target="_blank"
      rel="noopener noreferrer"
      {...(Icon ? { "aria-label": mark.name } : {})}
    >
      {inside}
    </a>
  );
}

/** Every mark this church holds, as a row. Reused by the contact section. */
export function SocialRow({
  site,
  size = "regular",
  className = "",
}: {
  site: SiteCtx;
  size?: "regular" | "large";
  className?: string;
}) {
  const marks = socialMarks(site.doc.social);
  if (marks.length === 0) return null;
  return (
    <ul className={`m-0 flex list-none flex-wrap gap-3 p-0 ${className}`}>
      {marks.map((mark) => (
        <li key={mark.key}>
          <MarkView mark={mark} site={site} size={size} />
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------- the section --- */

export function SocialSection({ section, site }: SectionViewProps) {
  const marks = socialMarks(site.doc.social);
  const centred = section.variant === "band" || section.style?.align === "centre";

  return (
    <Band id={section.id} style={section.style} site={site}>
      <Inner>
        <div
          className={`flex flex-col gap-[calc(var(--s-gap)*1.1)] ${
            centred ? "items-center text-center" : ""
          }`}
        >
          <Head content={section.content} site={site} centred={centred} />
          {marks.length === 0 ? (
            <NothingYet site={site}>{t("website.empty.social")}</NothingYet>
          ) : (
            <SocialRow
              site={site}
              size={section.variant === "band" ? "large" : "regular"}
              className={centred ? "justify-center" : ""}
            />
          )}
        </div>
      </Inner>
    </Band>
  );
}
