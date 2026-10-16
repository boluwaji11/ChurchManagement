/**
 * HRT-379, R22.2. What a church says it is about.
 *
 * Four arrangements of the same rows: three cards with room for a photograph,
 * four tighter cards carrying a mark, a divided list that reads like a page of
 * a book, and a numbered run where the numeral does the work a card would.
 */

import {
  BookOpen, Church, Compass, Cross, Flame, Gift, Globe, Hand, HandHeart, Handshake,
  Heart, HeartHandshake, Leaf, Music, Sprout, Sun, Users, Utensils,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { t } from "@connectapp/i18n";
import {
  imageOf, richOf, rowsOf, textOf, type Rich, type SiteImage,
} from "@connectapp/db/rules";
import {
  BODY, Band, Card, Grid, Head, Inner, NothingYet, P, Pic, SUBHEAD, T, type SiteCtx,
} from "../kit";
import type { SectionViewProps } from "../section-props";

/**
 * The marks a value can carry, by the name the editor stores.
 *
 * A name nobody knows draws nothing, so a document written by hand or carried
 * over from an import cannot put a broken glyph on a published page.
 */
const MARKS: Record<string, LucideIcon> = {
  book: BookOpen, church: Church, compass: Compass, cross: Cross, flame: Flame,
  gift: Gift, globe: Globe, hand: Hand, handHeart: HandHeart, handshake: Handshake,
  heart: Heart, hospitality: HeartHandshake, leaf: Leaf, music: Music,
  prayer: Hand, seed: Sprout, sun: Sun, table: Utensils, together: Users,
};

/** One value's own mark, in the theme's primary on a wash of it. */
function Mark({ name }: { name: string }) {
  const Icon = MARKS[name];
  if (!Icon) return null;
  return (
    <span
      aria-hidden
      className={
        "grid size-12 shrink-0 place-items-center rounded-[var(--s-corner)]"
        + " bg-[var(--s-primary-soft)] text-[var(--s-primary)]"
      }
    >
      <Icon className="size-6" />
    </span>
  );
}

interface Row {
  key: string;
  at: string;
  title: string;
  body: Rich;
  icon: string;
  image: SiteImage | null;
}

const rowsFrom = (content: Record<string, unknown>): Row[] =>
  rowsOf(content["items"]).map((row, index) => ({
    key: `${index}`,
    at: `items.${index}`,
    title: textOf(row["title"]),
    body: richOf(row["body"]),
    icon: textOf(row["icon"]),
    image: imageOf(row["image"]),
  }));

function Title({ row, site }: { row: Row; site: SiteCtx }) {
  return (
    <T
      value={row.title}
      as="h3"
      at={`${row.at}.title`}
      site={site}
      className={SUBHEAD}
      placeholder={t("website.ph.values.title")}
    />
  );
}

function Body({ row, site }: { row: Row; site: SiteCtx }) {
  return (
    <P
      value={row.body}
      at={`${row.at}.body`}
      site={site}
      className={`${BODY} text-[var(--s-muted)]`}
      placeholder={t("website.ph.values.body")}
    />
  );
}

export function ValuesSection({ section, site }: SectionViewProps) {
  const content = section.content;
  const rows = rowsFrom(content);
  const centred = section.style?.align === "centre";
  const variant = section.variant;

  let body: ReactNode;
  if (rows.length === 0) {
    body = <NothingYet site={site}>{t("website.empty.values")}</NothingYet>;
  } else if (variant === "fourCards") {
    /* Tighter than three, and the mark carries the card rather than a
       photograph: four pictures across a row are postage stamps. */
    body = (
      <Grid columns={4}>
        {rows.map((row) => (
          <Card key={row.key} className="flex h-full flex-col gap-4">
            <Mark name={row.icon} />
            <Title row={row} site={site} />
            <Body row={row} site={site} />
          </Card>
        ))}
      </Grid>
    );
  } else if (variant === "list") {
    body = (
      <ul
        className={
          "m-0 flex list-none flex-col divide-y p-0 [border-color:var(--s-line)]"
          + " [&>li]:[border-color:var(--s-line)]"
        }
      >
        {rows.map((row) => (
          <li
            key={row.key}
            className="grid gap-3 py-7 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-8"
          >
            <div className="flex items-start gap-3">
              <Mark name={row.icon} />
              <Title row={row} site={site} />
            </div>
            <Body row={row} site={site} />
          </li>
        ))}
      </ul>
    );
  } else if (variant === "numbered") {
    body = (
      <ol className="m-0 grid list-none gap-[calc(var(--s-gap)*1.4)] p-0 sm:grid-cols-2">
        {rows.map((row, index) => (
          <li key={row.key} className="flex items-start gap-5">
            <span
              aria-hidden
              className={
                "font-[family-name:var(--s-display)] text-[length:var(--s-h2)]"
                + " leading-none text-[var(--s-primary)]"
              }
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="flex flex-col gap-2.5">
              <Title row={row} site={site} />
              <Body row={row} site={site} />
            </div>
          </li>
        ))}
      </ol>
    );
  } else {
    /* threeCards */
    body = (
      <Grid columns={3}>
        {rows.map((row) => (
          <Card key={row.key} className="flex h-full flex-col overflow-hidden" pad={false}>
            <Pic
              value={row.image}
              at={`${row.at}.image`}
              site={site}
              ratio="16 / 10"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              alt={t("website.ph.values.image")}
            />
            <div className="flex flex-1 flex-col gap-4 p-6 sm:p-7">
              <Mark name={row.icon} />
              <Title row={row} site={site} />
              <Body row={row} site={site} />
            </div>
          </Card>
        ))}
      </Grid>
    );
  }

  return (
    <Band id={section.id} style={section.style} site={site}>
      <Inner wide>
        <div className="flex flex-col gap-[calc(var(--s-gap)*1.6)]">
          <Head content={content} site={site} centred={centred} />
          {body}
        </div>
      </Inner>
    </Band>
  );
}
