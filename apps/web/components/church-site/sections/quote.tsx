/**
 * HRT-379, R22.2. What people say about a church.
 *
 * Three arrangements: the words set large across the reading measure, a grid
 * of cards for a set of shorter ones, and a band where one portrait sits
 * beside the words.
 *
 * Each one is a `figure` holding a `blockquote` and its `figcaption`, so the
 * attribution belongs to the quotation rather than floating under it.
 */

import type { ReactNode } from "react";
import { Quote as QuoteMark } from "lucide-react";
import { t } from "@connectapp/i18n";
import {
  imageOf, richOf, rowsOf, textOf, type Rich, type SiteImage,
} from "@connectapp/db/rules";
import {
  BODY, Band, Card, Grid, Head, Inner, NothingYet, P, Pic, T,
  type SiteCtx,
} from "../kit";
import type { SectionViewProps } from "../section-props";

/** The words of a quotation, set larger than a paragraph. */
const SAID =
  "font-[family-name:var(--s-display)] font-[number:var(--s-display-weight)]"
  + " leading-[1.35] tracking-[var(--s-display-tracking)]";

/** The two sizes a quotation is set at, named so Tailwind can see them. */
const SAID_LARGE = `${SAID} text-[length:var(--s-h2)]`;
const SAID_MEDIUM = `${SAID} text-[length:var(--s-h3)]`;

const NAME = `${BODY} m-0 font-semibold`;

const ROLE = `${BODY} m-0 text-[var(--s-muted)]`;

interface Row {
  key: string;
  at: string;
  body: Rich;
  name: string;
  role: string;
  image: SiteImage | null;
}

const rowsFrom = (content: Record<string, unknown>): Row[] =>
  rowsOf(content["items"]).map((row, index) => ({
    key: `${index}`,
    at: `items.${index}`,
    body: richOf(row["body"]),
    name: textOf(row["name"]),
    role: textOf(row["role"]),
    image: imageOf(row["image"]),
  }));

/** The name and the role under a quotation. */
function Attribution({
  row,
  site,
  withPortrait,
  centred,
}: {
  row: Row;
  site: SiteCtx;
  withPortrait?: boolean;
  centred?: boolean;
}) {
  return (
    <figcaption
      className={`flex items-center gap-3.5 ${centred ? "justify-center" : ""}`}
    >
      {withPortrait ? (
        <Pic
          value={row.image}
          at={`${row.at}.image`}
          site={site}
          ratio="1 / 1"
          sizes="56px"
          className="size-14 shrink-0 rounded-full"
          alt={t("website.ph.quote.image")}
        />
      ) : null}
      <span className={`flex flex-col ${centred && !withPortrait ? "items-center" : ""}`}>
        <T value={row.name} as="span" at={`${row.at}.name`} site={site} className={NAME} />
        <T value={row.role} as="span" at={`${row.at}.role`} site={site} className={ROLE} />
      </span>
    </figcaption>
  );
}

function Said({
  row,
  site,
  className,
  centred,
}: {
  row: Row;
  site: SiteCtx;
  /** Which of the theme's sizes the words are set at. */
  className: string;
  centred?: boolean;
}) {
  return (
    <blockquote className="m-0">
      <P
        value={row.body}
        at={`${row.at}.body`}
        site={site}
        className={className}
        style={{ maxWidth: centred ? "40ch" : "46ch" }}
        placeholder={t("website.ph.quote.title")}
      />
    </blockquote>
  );
}

export function QuoteSection({ section, site }: SectionViewProps) {
  const content = section.content;
  const rows = rowsFrom(content);
  const centred = section.style?.align === "centre";
  const variant = section.variant;

  let body: ReactNode;
  if (rows.length === 0) {
    body = <NothingYet site={site}>{t("website.empty.quote")}</NothingYet>;
  } else if (variant === "cards") {
    body = (
      <Grid columns={3}>
        {rows.map((row) => (
          <Card key={row.key} className="flex h-full flex-col gap-5">
            <QuoteMark aria-hidden className="size-7 text-[var(--s-primary)]" />
            <figure className="m-0 flex flex-1 flex-col gap-5">
              <blockquote className="m-0 flex-1">
                <P
                  value={row.body}
                  at={`${row.at}.body`}
                  site={site}
                  className={BODY}
                  placeholder={t("website.ph.quote.title")}
                />
              </blockquote>
              <Attribution row={row} site={site} withPortrait />
            </figure>
          </Card>
        ))}
      </Grid>
    );
  } else if (variant === "band") {
    /* One voice at a time, the portrait beside the words rather than under
       them, and any further quotations ruled off below. */
    body = (
      <div className="flex flex-col divide-y [&>*]:[border-color:var(--s-line)]">
        {rows.map((row) => (
          <figure
            key={row.key}
            className={
              "m-0 grid items-center gap-[calc(var(--s-gap)*1.3)] py-[var(--s-gap)]"
              + " first:pt-0 last:pb-0 sm:grid-cols-[auto_1fr]"
            }
          >
            <Pic
              value={row.image}
              at={`${row.at}.image`}
              site={site}
              ratio="1 / 1"
              sizes="(min-width: 640px) 160px, 100vw"
              className="w-[140px] rounded-full sm:w-[160px]"
              alt={t("website.ph.quote.image")}
            />
            <div className="flex flex-col gap-[var(--s-gap)]">
              <Said row={row} site={site} className={SAID_MEDIUM} />
              <Attribution row={row} site={site} />
            </div>
          </figure>
        ))}
      </div>
    );
  } else {
    /* single: the words carry the whole width of the reading measure, each
       quotation ruled off from the one before with a short hairline. */
    body = (
      <div className="flex flex-col gap-[calc(var(--s-pad)*0.4)]">
        {rows.map((row, index) => (
          <figure
            key={row.key}
            className={
              `m-0 flex flex-col gap-[var(--s-gap)] ${centred ? "items-center text-center" : ""}`
            }
          >
            {index === 0 ? (
              <QuoteMark aria-hidden className="size-8 text-[var(--s-primary)]" />
            ) : (
              <span aria-hidden className="block h-px w-16 bg-[var(--s-line)]" />
            )}
            <Said row={row} site={site} className={SAID_LARGE} centred={centred} />
            <Attribution row={row} site={site} withPortrait centred={centred} />
          </figure>
        ))}
      </div>
    );
  }

  return (
    <Band id={section.id} style={section.style} site={site}>
      <Inner wide={variant === "cards"}>
        <div
          className={
            `flex flex-col gap-[calc(var(--s-gap)*1.6)] ${centred ? "items-center" : ""}`
          }
        >
          <Head content={content} site={site} centred={centred} />
          {body}
        </div>
      </Inner>
    </Band>
  );
}
