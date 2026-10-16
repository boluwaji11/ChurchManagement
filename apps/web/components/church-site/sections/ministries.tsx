/**
 * HRT-379, R22.2. The groups and ministries of this church.
 *
 * Bound to the church's groups, this is the page that stops being out of date:
 * a group opened in the product appears here, and one that closes leaves. A
 * bound card is not editable, because its words belong to the group's own
 * record, and its action goes to the group's page on the church's site.
 */

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { t } from "@connectapp/i18n";
import type { Rich, SiteImage, SiteLink } from "@connectapp/db/rules";
import { imageOf, linkOf, richOf, rowsOf, textOf } from "@connectapp/db/rules";
import {
  Band, BODY, Btn, Btns, Card, EYEBROW, Grid, Head, Inner, NothingYet, P, Pic,
  standsDown,
  SUBHEAD, T, dayName, timeLabel,
} from "../kit";
import type { SectionViewProps } from "../section-props";

type Site = SectionViewProps["site"];

/**
 * One card, from a group's record or from the section's own content.
 *
 * `at` is the path the canvas writes an edit back to, and a bound card has
 * none: the church changes a group in the product rather than on the page.
 */
interface Entry {
  title: string;
  body: Rich;
  image: SiteImage | null;
  meta: string;
  action: SiteLink | null;
  /** Where a bound card's action goes, which is a page of this church's site. */
  href: string | null;
  at: string | null;
}

export function MinistriesSection({ section, site }: SectionViewProps) {
  const bound = section.bind?.source === "groups";
  const entries: Entry[] = bound
    ? site.data.groups.map((group) => ({
        title: group.name,
        body: group.description ? [{ t: group.description }] : [],
        image: group.photoKey
          ? { key: group.photoKey, url: null, alt: group.name }
          : null,
        meta: [
          group.dayOfWeek === null
            ? ""
            : group.startsAt
              ? t("website.part.serviceAt", {
                  day: dayName(group.dayOfWeek, site.country),
                  time: timeLabel(group.startsAt, site.country),
                })
              : t("website.part.weekly", { day: dayName(group.dayOfWeek, site.country) }),
          group.online ? t("website.part.online") : group.location ?? "",
        ].filter(Boolean).join(" · "),
        action: null,
        href: `/g/${site.slug}/${group.slug ?? group.id}`,
        at: null,
      }))
    : rowsOf(section.content["items"]).map((row, index) => ({
        title: textOf(row["title"]),
        body: richOf(row["body"]),
        image: imageOf(row["image"]),
        meta: "",
        action: linkOf(row["action"]),
        href: null,
        at: `items.${index}`,
      }));

  const action = linkOf(section.content["action"]);
  const variant = section.variant;

  /* Bound and empty: the band comes off a published page rather than
     standing there with a heading and a blank space under it. */
  if (standsDown(site, bound, entries.length)) return null;
  const centred = section.style?.align === "centre" && variant === "threeCards";


  return (
    <Band id={section.id} style={section.style} site={site}>
      <Inner wide={variant !== "editorial"}>
        <div className="flex flex-col gap-[calc(var(--s-gap)*1.5)]">
          <Head content={section.content} site={site} centred={centred} />
          {entries.length === 0 ? (
            <NothingYet site={site}>{t("website.empty.ministries")}</NothingYet>
          ) : variant === "featured" ? (
            <Featured entries={entries} site={site} />
          ) : variant === "rows" ? (
            <Rows entries={entries} site={site} />
          ) : variant === "editorial" ? (
            <Editorial entries={entries} site={site} />
          ) : (
            <Grid columns={3}>
              {entries.map((entry, index) => (
                <Tile key={entry.at ?? index} entry={entry} site={site} ratio="16 / 10" />
              ))}
            </Grid>
          )}
          {action ? (
            <Btns className={centred ? "justify-center" : ""}>
              <Btn value={action} at="action" site={site} />
            </Btns>
          ) : null}
        </div>
      </Inner>
    </Band>
  );
}

/* ------------------------------------------------------------ the layouts --- */

/** One large card beside two smaller ones. */
function Featured({ entries, site }: { entries: Entry[]; site: Site }) {
  const [first, ...rest] = entries;
  if (!first) return null;
  return (
    <div className="grid grid-cols-1 gap-[calc(var(--s-gap)*1.1)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <Tile entry={first} site={site} ratio="16 / 11" large />
      <div className="flex flex-col gap-[calc(var(--s-gap)*1.1)]">
        {rest.slice(0, 2).map((entry, index) => (
          <Tile key={entry.at ?? index} entry={entry} site={site} ratio="16 / 7" />
        ))}
      </div>
    </div>
  );
}

/** Picture-led horizontal rows, alternating which side the picture sits on. */
function Rows({ entries, site }: { entries: Entry[]; site: Site }) {
  return (
    <div className="flex flex-col gap-[calc(var(--s-gap)*1.4)]">
      {entries.map((entry, index) => (
        <div
          key={entry.at ?? index}
          className="grid grid-cols-1 items-center gap-[calc(var(--s-gap)*1.2)] sm:grid-cols-[minmax(0,4fr)_minmax(0,6fr)]"
        >
          <Pic
            value={entry.image}
            at={entry.at ? `${entry.at}.image` : undefined}
            site={site}
            ratio="4 / 3"
            sizes="(min-width: 640px) 40vw, 100vw"
            alt={t("website.ph.ministries.image")}
            className={
              "rounded-[var(--s-image-corner)]"
              + (index % 2 === 1 ? " sm:order-2" : "")
            }
          />
          <div className="flex flex-col gap-3">
            <Meta entry={entry} />
            <T
              value={entry.title}
              as="h3"
              at={entry.at ? `${entry.at}.title` : undefined}
              site={site}
              className={SUBHEAD}
            />
            <P
              value={entry.body}
              at={entry.at ? `${entry.at}.body` : undefined}
              site={site}
              className={`${BODY} text-[var(--s-muted)]`}
            />
            <Action entry={entry} site={site} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Two columns of text, a hairline between entries, no pictures. */
function Editorial({ entries, site }: { entries: Entry[]; site: Site }) {
  return (
    <div className="flex flex-col">
      {entries.map((entry, index) => (
        <div
          key={entry.at ?? index}
          className={
            "grid grid-cols-1 gap-x-10 gap-y-3 border-t border-[var(--s-line)]"
            + " py-[calc(var(--s-gap)*1.1)] last:border-b sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
          }
        >
          <div className="flex flex-col gap-2">
            <T
              value={entry.title}
              as="h3"
              at={entry.at ? `${entry.at}.title` : undefined}
              site={site}
              className={SUBHEAD}
            />
            <Meta entry={entry} />
          </div>
          <div className="flex flex-col items-start gap-3">
            <P
              value={entry.body}
              at={entry.at ? `${entry.at}.body` : undefined}
              site={site}
              className={`${BODY} text-[var(--s-muted)]`}
            />
            <Action entry={entry} site={site} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- the parts --- */

/** A card: picture above, then the words. */
function Tile({
  entry,
  site,
  ratio,
  large,
}: {
  entry: Entry;
  site: Site;
  ratio: string;
  large?: boolean;
}) {
  return (
    <Card className="flex h-full flex-col gap-4 overflow-hidden" pad={false}>
      <Pic
        value={entry.image}
        at={entry.at ? `${entry.at}.image` : undefined}
        site={site}
        ratio={ratio}
        sizes={large ? "(min-width: 1024px) 58vw, 100vw" : "(min-width: 640px) 33vw, 100vw"}
        alt={t("website.ph.ministries.image")}
      />
      <div className="flex flex-1 flex-col items-start gap-3 p-6 pt-0 sm:p-7 sm:pt-0">
        <Meta entry={entry} />
        <T
          value={entry.title}
          as="h3"
          at={entry.at ? `${entry.at}.title` : undefined}
          site={site}
          className={large ? `${SUBHEAD} text-[length:var(--s-h2)]` : SUBHEAD}
        />
        <P
          value={entry.body}
          at={entry.at ? `${entry.at}.body` : undefined}
          site={site}
          className={`${BODY} text-[var(--s-muted)]`}
        />
        <div className="mt-auto pt-1">
          <Action entry={entry} site={site} />
        </div>
      </div>
    </Card>
  );
}

/** When and where a bound group meets. Content rows carry no meeting line. */
function Meta({ entry }: { entry: Entry }) {
  if (!entry.meta) return null;
  return <p className={EYEBROW}>{entry.meta}</p>;
}

const ACTION_LOOK =
  `${BODY} inline-flex items-center gap-1.5 font-semibold text-[var(--s-primary)]`
  + " no-underline underline-offset-[5px] decoration-[1.5px] hover:underline"
  + " focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
  + " focus-visible:outline-[var(--s-primary)]";

/**
 * What a card is pressed for.
 *
 * A content row carries the church's own button. A bound card goes to the
 * group's own page, which is an address on this site rather than a destination
 * a church can choose, so it is a link rather than a `SiteLink`. Inside the
 * canvas it is drawn and does not navigate, because pressing a card there is
 * how a church selects it.
 */
function Action({ entry, site }: { entry: Entry; site: Site }) {
  if (entry.action) {
    return <Btn value={entry.action} at={entry.at ? `${entry.at}.action` : undefined} site={site} tone="quiet" />;
  }
  if (!entry.href) {
    /* An unbound row with nothing chosen still needs somewhere to press in the
       editor, which `Btn` draws from the empty value. */
    return entry.at ? (
      <Btn value={null} at={`${entry.at}.action`} site={site} tone="quiet" />
    ) : null;
  }
  const words = (
    <>
      {t("website.part.joinGroup")}
      <ArrowRight aria-hidden className="size-[1.1em]" />
    </>
  );
  return site.editing ? (
    <span className={ACTION_LOOK}>{words}</span>
  ) : (
    <Link href={entry.href} className={ACTION_LOOK}>{words}</Link>
  );
}
