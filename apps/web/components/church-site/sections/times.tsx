/**
 * HRT-379, R22.2. When this church gathers, and where.
 *
 * The section a visitor came for. It reads the church's own service times when
 * it is bound to them, so a time changed in Settings changes on the website,
 * and reads its own rows when the church would rather write them out. A bound
 * row carries no `at`, which is what keeps the canvas from offering to edit a
 * value whose home is somewhere else.
 */

import * as React from "react";
import { Clock3, MapPin } from "lucide-react";
import { t } from "@connectapp/i18n";
import { linkOf, rowsOf, textOf } from "@connectapp/db/rules";
import {
  Band, BODY, Btn, Btns, Card, EYEBROW, Grid, Head, Inner, NothingYet, SUBHEAD, T,
  dayName, timeLabel,
} from "../kit";
import type { SectionViewProps } from "../section-props";

/** One line of the table, from the church's records or from its own content. */
interface TimeRow {
  name: string;
  when: string;
  where: string;
  note: string;
  /** Where the canvas writes an edit back to, or nothing for a bound row. */
  at: string | null;
}

export function TimesSection({ section, site }: SectionViewProps) {
  const bound = section.bind?.source === "serviceTimes";
  const rows: TimeRow[] = bound
    ? site.data.services.map((service) => ({
        name: service.name,
        when: t("website.part.serviceAt", {
          day: dayName(service.dayOfWeek, site.country),
          time: timeLabel(service.startsAt, site.country),
        }),
        where: service.campus ?? "",
        note: "",
        at: null,
      }))
    : rowsOf(section.content["items"]).map((row, index) => ({
        name: textOf(row["name"]),
        when: textOf(row["when"]),
        where: textOf(row["where"]),
        note: textOf(row["note"]),
        at: `items.${index}`,
      }));

  const action = linkOf(section.content["action"]);
  const variant = section.variant;
  const centred = section.style?.align === "centre" || variant === "band";

  return (
    <Band id={section.id} style={section.style} site={site}>
      <Inner wide={variant === "band"}>
        <div className="flex flex-col gap-[calc(var(--s-gap)*1.4)]">
          <Head content={section.content} site={site} centred={centred} />
          {rows.length === 0 ? (
            <NothingYet site={site}>{t("website.empty.times")}</NothingYet>
          ) : variant === "list" ? (
            <ListTimes rows={rows} site={site} />
          ) : variant === "band" ? (
            <BandTimes rows={rows} site={site} />
          ) : (
            <CardTimes rows={rows} site={site} />
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

/* ------------------------------------------------------------- the cards --- */

/** A panel each, laid on the theme's grid. */
function CardTimes({ rows, site }: { rows: TimeRow[]; site: SiteCtxOf }) {
  return (
    <Grid columns={3}>
      {rows.map((row, index) => (
        <Card key={index} className="flex flex-col gap-3">
          <T
            value={row.name}
            as="h3"
            at={row.at ? `${row.at}.name` : undefined}
            site={site}
            className={SUBHEAD}
          />
          {/* The mark is drawn beside a value rather than beside a gap, and
              the line itself leaves the page when it holds nothing. */}
          <p className={`m-0 ${BODY} flex items-start gap-2 font-semibold empty:hidden`}>
            {row.when ? (
              <Clock3 aria-hidden className="mt-[0.2em] size-[1.05em] shrink-0 text-[var(--s-primary)]" />
            ) : null}
            <T
              value={row.when}
              at={row.at ? `${row.at}.when` : undefined}
              site={site}
            />
          </p>
          <p className={`m-0 ${BODY} flex items-start gap-2 text-[var(--s-muted)] empty:hidden`}>
            {row.where ? (
              <MapPin aria-hidden className="mt-[0.2em] size-[1.05em] shrink-0 text-[var(--s-primary)]" />
            ) : null}
            <T
              value={row.where}
              at={row.at ? `${row.at}.where` : undefined}
              site={site}
            />
          </p>
          <T
            value={row.note}
            as="p"
            at={row.at ? `${row.at}.note` : undefined}
            site={site}
            className={`m-0 ${BODY} text-[var(--s-muted)]`}
          />
        </Card>
      ))}
    </Grid>
  );
}

/* -------------------------------------------------------------- the list --- */

/**
 * A measured two-column table with a rule between its rows.
 *
 * Headings cannot sit inside a `dt`, so this is a list of rows rather than a
 * description list: the name is still an `h3` under the section's `h2`.
 */
function ListTimes({ rows, site }: { rows: TimeRow[]; site: SiteCtxOf }) {
  return (
    <div className="mx-auto w-full max-w-[72ch]">
      {rows.map((row, index) => (
        <div
          key={index}
          className={
            "grid grid-cols-1 gap-x-8 gap-y-2 border-t border-[var(--s-line)]"
            + " py-5 last:border-b sm:grid-cols-[1fr_auto] sm:items-baseline"
          }
        >
          <div className="flex flex-col gap-1.5">
            <T
              value={row.name}
              as="h3"
              at={row.at ? `${row.at}.name` : undefined}
              site={site}
              className={SUBHEAD}
            />
            <T
              value={row.where}
              as="p"
              at={row.at ? `${row.at}.where` : undefined}
              site={site}
              className={`m-0 ${BODY} text-[var(--s-muted)]`}
            />
            <T
              value={row.note}
              as="p"
              at={row.at ? `${row.at}.note` : undefined}
              site={site}
              className={`m-0 ${BODY} text-[var(--s-muted)]`}
            />
          </div>
          <T
            value={row.when}
            as="p"
            at={row.at ? `${row.at}.when` : undefined}
            site={site}
            className={
              "m-0 font-[family-name:var(--s-display)] text-[length:var(--s-h3)]"
              + " leading-[1.25] text-[var(--s-primary)] sm:text-right"
            }
          />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- the band --- */

/** One coloured strip across the page, with the times set inline along it. */
function BandTimes({ rows, site }: { rows: TimeRow[]; site: SiteCtxOf }) {
  return (
    <div
      className={
        "rounded-[var(--s-corner)] bg-[var(--s-primary-soft)]"
        + " px-5 py-7 sm:px-8 sm:py-9"
      }
    >
      <div className="flex flex-col items-stretch gap-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-12">
        {rows.map((row, index) => (
          <div
            key={index}
            className={
              "flex flex-col items-center gap-1 border-t border-[var(--s-line)]"
              + " pt-5 text-center first:border-t-0 first:pt-0 sm:border-t-0 sm:pt-0"
              + " sm:border-l sm:pl-12 sm:first:border-l-0 sm:first:pl-0"
            }
          >
            <T
              value={row.name}
              as="h3"
              at={row.at ? `${row.at}.name` : undefined}
              site={site}
              className={EYEBROW}
            />
            <T
              value={row.when}
              as="p"
              at={row.at ? `${row.at}.when` : undefined}
              site={site}
              className={
                "m-0 font-[family-name:var(--s-display)] text-[length:var(--s-h3)]"
                + " font-[number:var(--s-display-weight)] leading-[1.2]"
              }
            />
            <T
              value={row.where}
              as="p"
              at={row.at ? `${row.at}.where` : undefined}
              site={site}
              className={`m-0 ${BODY} text-[var(--s-muted)]`}
            />
            <T
              value={row.note}
              as="p"
              at={row.at ? `${row.at}.note` : undefined}
              site={site}
              className={`m-0 ${BODY} text-[var(--s-muted)]`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** The context, named once so the helpers below do not each re-import it. */
type SiteCtxOf = SectionViewProps["site"];
