/**
 * HRT-379, R22.2. A few numbers about a church.
 *
 * Three arrangements: a row divided by hairlines, a grid of cards, and a band
 * where the heading sits on one side and the numbers run along the other.
 *
 * A number is set in the display face and is not a heading, so it stays a
 * paragraph: nothing here changes the heading order of the page it is on.
 */

import type { ReactNode } from "react";
import { t } from "@connectapp/i18n";
import { rowsOf, textOf } from "@connectapp/db/rules";
import {
  Band, Card, DISPLAY, Grid, Head, Inner, NothingYet, T, type SiteCtx,
} from "../kit";
import type { SectionViewProps } from "../section-props";

/** The figure itself, as large as a heading and read as a figure. */
const VALUE = `${DISPLAY} text-[length:var(--s-h2)] leading-none`;

const LABEL =
  "m-0 font-[family-name:var(--s-body)] text-[0.82rem] font-semibold uppercase"
  + " tracking-[0.14em] text-[var(--s-muted)]";

interface Row {
  key: string;
  at: string;
  value: string;
  label: string;
}

const rowsFrom = (content: Record<string, unknown>): Row[] =>
  rowsOf(content["items"]).map((row, index) => ({
    key: `${index}`,
    at: `items.${index}`,
    value: textOf(row["value"]),
    label: textOf(row["label"]),
  }));

function Figure({
  row,
  site,
  centred,
}: {
  row: Row;
  site: SiteCtx;
  centred?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-2 ${centred ? "items-center text-center" : ""}`}>
      <T
        value={row.value}
        as="p"
        at={`${row.at}.value`}
        site={site}
        className={VALUE}
        placeholder={t("website.ph.stats.title")}
      />
      <T value={row.label} as="p" at={`${row.at}.label`} site={site} className={LABEL} />
    </div>
  );
}

export function StatsSection({ section, site }: SectionViewProps) {
  const content = section.content;
  const rows = rowsFrom(content);
  const centred = section.style?.align === "centre";
  const variant = section.variant;

  if (variant === "band") {
    /* The heading holds one side and the figures run along the other, so a
       band of numbers reads as a line in a sentence about the church. */
    return (
      <Band id={section.id} style={section.style} site={site}>
        <Inner wide>
          <div className="grid items-center gap-[calc(var(--s-gap)*1.4)] lg:grid-cols-[0.8fr_1.2fr]">
            <Head content={content} site={site} max="36ch" />
            {rows.length === 0 ? (
              <NothingYet site={site}>{t("website.empty.stats")}</NothingYet>
            ) : (
              <div className="flex flex-wrap gap-x-10 gap-y-7 lg:justify-end">
                {rows.map((row) => (
                  <Figure key={row.key} row={row} site={site} />
                ))}
              </div>
            )}
          </div>
        </Inner>
      </Band>
    );
  }

  let body: ReactNode;
  if (rows.length === 0) {
    body = <NothingYet site={site}>{t("website.empty.stats")}</NothingYet>;
  } else if (variant === "cards") {
    body = (
      <Grid columns={rows.length === 2 ? 2 : rows.length === 4 ? 4 : 3}>
        {rows.map((row) => (
          <Card key={row.key} className="flex flex-col justify-between gap-5">
            <Figure row={row} site={site} />
          </Card>
        ))}
      </Grid>
    );
  } else {
    /* row: hairlines between the figures from the small breakpoint up, where
       there is width for them to be read as divisions rather than as clutter. */
    body = (
      <div
        className={
          "grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
          + " sm:divide-x sm:[&>*]:[border-color:var(--s-line)] sm:[&>*]:px-6"
          + " sm:[&>*:first-child]:pl-0"
        }
      >
        {rows.map((row) => (
          <Figure key={row.key} row={row} site={site} centred={centred} />
        ))}
      </div>
    );
  }

  return (
    <Band id={section.id} style={section.style} site={site}>
      <Inner wide>
        <div className="flex flex-col gap-[calc(var(--s-gap)*1.5)]">
          <Head content={content} site={site} centred={centred} />
          {body}
        </div>
      </Inner>
    </Band>
  );
}
