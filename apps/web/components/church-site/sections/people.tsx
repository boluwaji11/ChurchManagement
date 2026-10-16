/**
 * HRT-379, R22.2. The people who lead a church.
 *
 * Three arrangements: a grid of portraits, one person given the room a
 * minister's letter needs with the rest in a tighter grid under them, and a
 * divided list that fits a long staff team without turning into a wall of
 * faces.
 *
 * A person's name is the card's `h3`, so a page with a people section still
 * reads as one heading level under the section's own.
 */

import type { ReactNode } from "react";
import { t } from "@connectapp/i18n";
import {
  imageOf, linkOf, richOf, rowsOf, textOf,
  type Rich, type SiteImage, type SiteLink,
} from "@connectapp/db/rules";
import {
  BODY, Band, Btn, Card, Grid, Head, Inner, NothingYet, P, Pic, SUBHEAD, T,
  type SiteCtx,
} from "../kit";
import type { SectionViewProps } from "../section-props";

/** The role under a name, which is a label rather than a heading. */
const ROLE =
  "m-0 font-[family-name:var(--s-body)] text-[0.82rem] font-semibold uppercase"
  + " tracking-[0.14em] text-[var(--s-primary)]";

interface Row {
  key: string;
  at: string;
  name: string;
  role: string;
  body: Rich;
  image: SiteImage | null;
  action: SiteLink | null;
}

const rowsFrom = (content: Record<string, unknown>): Row[] =>
  rowsOf(content["items"]).map((row, index) => ({
    key: `${index}`,
    at: `items.${index}`,
    name: textOf(row["name"]),
    role: textOf(row["role"]),
    body: richOf(row["body"]),
    image: imageOf(row["image"]),
    action: linkOf(row["action"]),
  }));

function Named({ row, site }: { row: Row; site: SiteCtx }) {
  return (
    <div className="flex flex-col gap-1.5">
      <T
        value={row.name}
        as="h3"
        at={`${row.at}.name`}
        site={site}
        className={SUBHEAD}
        placeholder={t("website.ph.people.title")}
      />
      <T value={row.role} as="p" at={`${row.at}.role`} site={site} className={ROLE} />
    </div>
  );
}

function Blurb({ row, site }: { row: Row; site: SiteCtx }) {
  return (
    <P
      value={row.body}
      at={`${row.at}.body`}
      site={site}
      className={`${BODY} text-[var(--s-muted)]`}
      placeholder={t("website.ph.people.body")}
    />
  );
}

function PersonCard({ row, site }: { row: Row; site: SiteCtx }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden" pad={false}>
      <Pic
        value={row.image}
        at={`${row.at}.image`}
        site={site}
        ratio="4 / 5"
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        alt={t("website.ph.people.image")}
      />
      <div className="flex flex-1 flex-col gap-3 p-6 sm:p-7">
        <Named row={row} site={site} />
        <Blurb row={row} site={site} />
        <div className="mt-auto pt-1">
          <Btn value={row.action} at={`${row.at}.action`} site={site} tone="quiet" />
        </div>
      </div>
    </Card>
  );
}

export function PeopleSection({ section, site }: SectionViewProps) {
  const content = section.content;
  const rows = rowsFrom(content);
  const centred = section.style?.align === "centre";
  const variant = section.variant;
  const first = rows[0];

  let body: ReactNode;
  if (rows.length === 0 || !first) {
    body = <NothingYet site={site}>{t("website.empty.people")}</NothingYet>;
  } else if (variant === "featured") {
    body = (
      <div className="flex flex-col gap-[calc(var(--s-gap)*1.4)]">
        <div className="grid items-center gap-[calc(var(--s-gap)*1.4)] lg:grid-cols-[0.85fr_1.15fr]">
          <Pic
            value={first.image}
            at={`${first.at}.image`}
            site={site}
            ratio="4 / 5"
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="w-full rounded-[var(--s-image-corner)]"
            alt={t("website.ph.people.image")}
          />
          <div className="flex flex-col gap-[var(--s-gap)]">
            <Named row={first} site={site} />
            <Blurb row={first} site={site} />
            <Btn value={first.action} at={`${first.at}.action`} site={site} tone="secondary" />
          </div>
        </div>
        {rows.length > 1 ? (
          <Grid columns={3}>
            {rows.slice(1).map((row) => (
              <div key={row.key} className="flex items-start gap-4">
                <Pic
                  value={row.image}
                  at={`${row.at}.image`}
                  site={site}
                  ratio="1 / 1"
                  sizes="88px"
                  className="w-[88px] shrink-0 rounded-[var(--s-image-corner)]"
                  alt={t("website.ph.people.image")}
                />
                <Named row={row} site={site} />
              </div>
            ))}
          </Grid>
        ) : null}
      </div>
    );
  } else if (variant === "rows") {
    body = (
      <ul
        className={
          "m-0 flex list-none flex-col divide-y p-0 [border-color:var(--s-line)]"
          + " [&>li]:[border-color:var(--s-line)]"
        }
      >
        {rows.map((row) => (
          <li key={row.key} className="flex flex-col gap-5 py-7 sm:flex-row sm:items-start">
            <Pic
              value={row.image}
              at={`${row.at}.image`}
              site={site}
              ratio="1 / 1"
              sizes="(min-width: 640px) 120px, 100vw"
              className="w-full rounded-[var(--s-image-corner)] sm:w-[120px] sm:shrink-0"
              alt={t("website.ph.people.image")}
            />
            <div className="flex flex-1 flex-col gap-2.5">
              <Named row={row} site={site} />
              <Blurb row={row} site={site} />
            </div>
            <div className="sm:shrink-0 sm:pt-1">
              <Btn value={row.action} at={`${row.at}.action`} site={site} tone="quiet" />
            </div>
          </li>
        ))}
      </ul>
    );
  } else {
    /* cards */
    body = (
      <Grid columns={3}>
        {rows.map((row) => <PersonCard key={row.key} row={row} site={site} />)}
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
