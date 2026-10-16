/**
 * HRT-379, R22.2. What this church has coming up, on its own website.
 *
 * Two sources, one set of cards. Bound, the rows are the church's published
 * events and nothing in them is editable, because the place to change an event
 * is the event. Manual, every field is the church's own words and carries its
 * path so the canvas can put a cursor in it.
 */

import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { t } from "@connectapp/i18n";
import {
  imageOf, linkOf, richOf, rowsOf, textOf,
  type Rich, type SiteImage, type SiteLink,
} from "@connectapp/db/rules";
import {
  BODY, Band, Btn, Btns, Card, Grid, Head, Inner, NothingYet, P, Pic, SUBHEAD, T,
  dateLabel, timeLabel, type SiteCtx,
} from "../kit";
import type { SectionViewProps } from "../section-props";

/** The quiet link a card ends on, in the theme's own primary. */
const ACTION =
  `${BODY} inline-flex w-fit items-center gap-1.5 font-semibold`
  + " text-[var(--s-primary)] underline decoration-[1.5px] underline-offset-[5px]"
  + " transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2"
  + " focus-visible:outline-offset-2 focus-visible:outline-[var(--s-primary)]";

/**
 * A line of detail under a card's heading.
 *
 * Hidden until it has words, so an empty date never leaves a lone calendar mark
 * on a published page. The text is a span when there is any, and in the editor
 * there is always a span, which is how the church can still press an empty one.
 */
const DETAIL =
  `${BODY} m-0 hidden items-start gap-2 text-[var(--s-muted)] [&:has(span)]:flex`;

/** One card's worth, however it was come by. */
interface Row {
  key: string;
  /** The path its fields are edited at, or nothing for a bound row. */
  at: string | null;
  title: string;
  when: string;
  where: string;
  body: Rich;
  image: SiteImage | null;
  /** The church's own button, on a manual row. */
  action: SiteLink | null;
  /** Where a bound row goes, and what its link says. */
  href: string | null;
  label: string;
  hue: string | null;
}

/** The twelve hues are named, so a name is all that is ever read. */
const hueOf = (hue: string): string | null =>
  /^[a-z]{2,16}$/.test(hue) ? hue : null;

function boundRows(site: SiteCtx, limit: number): Row[] {
  return site.data.events.slice(0, limit).map((event) => {
    const date = dateLabel(event.startsOn, site.country, true);
    return {
      key: event.id,
      at: null,
      title: event.name,
      when: event.startsAt
        ? t("website.part.serviceAt", {
            day: date, time: timeLabel(event.startsAt, site.country),
          })
        : date,
      where: [event.location, event.city].filter(Boolean).join(", "),
      body: [],
      image: { key: event.coverKey, url: null, alt: event.name },
      action: null,
      href: event.takesRegistrations
        ? `/e/${site.slug}/${event.slug}/register`
        : `/e/${site.slug}/${event.slug}`,
      label: event.takesRegistrations
        ? t("website.part.register")
        : t("website.part.details"),
      hue: hueOf(event.hue),
    };
  });
}

function manualRows(content: Record<string, unknown>): Row[] {
  return rowsOf(content["items"]).map((row, index) => ({
    key: `${index}`,
    at: `items.${index}`,
    title: textOf(row["title"]),
    when: textOf(row["when"]),
    where: textOf(row["where"]),
    body: richOf(row["body"]),
    image: imageOf(row["image"]),
    action: linkOf(row["action"]),
    href: null,
    label: "",
    hue: null,
  }));
}

/**
 * A bound row's link, which inside the canvas goes nowhere.
 *
 * The canvas is an editing surface, so a press there selects rather than
 * navigates, and a link that walks the church off its own draft would lose it.
 */
function RowAction({ row, site, stretch }: { row: Row; site: SiteCtx; stretch?: boolean }) {
  if (row.at) return <Btn value={row.action} at={`${row.at}.action`} site={site} tone="quiet" />;
  if (!row.href) return null;
  const inner = (
    <>
      {row.label}
      <ArrowRight className="size-4 shrink-0" aria-hidden />
    </>
  );
  if (site.editing) return <span className={ACTION}>{inner}</span>;
  return (
    <Link
      href={row.href}
      className={`${ACTION}${stretch ? " after:absolute after:inset-0 after:rounded-[inherit]" : ""}`}
    >
      {inner}
    </Link>
  );
}

function Hue({ hue, className = "h-1.5 w-full" }: { hue: string | null; className?: string }) {
  if (!hue) return null;
  return (
    <span
      aria-hidden
      className={`block shrink-0 ${className}`}
      style={{ background: `var(--hue-${hue}-500)` }}
    />
  );
}

function Detail({ row, site }: { row: Row; site: SiteCtx }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className={DETAIL}>
        <CalendarDays className="mt-[0.2em] size-4 shrink-0" aria-hidden />
        <T
          value={row.when}
          site={site}
          at={row.at ? `${row.at}.when` : undefined}
          placeholder={t("website.part.when")}
        />
      </p>
      <p className={DETAIL}>
        <MapPin className="mt-[0.2em] size-4 shrink-0" aria-hidden />
        <T
          value={row.where}
          site={site}
          at={row.at ? `${row.at}.where` : undefined}
          placeholder={t("website.part.where")}
        />
      </p>
    </div>
  );
}

function CardRow({ row, site, priority }: { row: Row; site: SiteCtx; priority?: boolean }) {
  return (
    <Card className="relative flex h-full flex-col overflow-hidden" pad={false}>
      <Hue hue={row.hue} />
      <Pic
        value={row.image}
        at={row.at ? `${row.at}.image` : undefined}
        site={site}
        ratio="16 / 10"
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        priority={priority}
        alt={t("website.ph.events.image")}
      />
      <div className="flex flex-1 flex-col gap-3 p-6 sm:p-7">
        <T
          value={row.title}
          as="h3"
          at={row.at ? `${row.at}.title` : undefined}
          site={site}
          className={SUBHEAD}
          placeholder={t("website.ph.events.title")}
        />
        <Detail row={row} site={site} />
        <P
          value={row.body}
          at={row.at ? `${row.at}.body` : undefined}
          site={site}
          className={`${BODY} text-[var(--s-muted)]`}
          placeholder={t("website.ph.events.body")}
        />
        <div className="mt-auto pt-1">
          <RowAction row={row} site={site} stretch />
        </div>
      </div>
    </Card>
  );
}

function ListRow({ row, site }: { row: Row; site: SiteCtx }) {
  return (
    <li className="relative flex flex-col gap-5 py-7 sm:flex-row sm:items-center">
      <Pic
        value={row.image}
        at={row.at ? `${row.at}.image` : undefined}
        site={site}
        ratio="4 / 3"
        sizes="(min-width: 640px) 220px, 100vw"
        className="w-full rounded-[var(--s-image-corner)] sm:w-[220px] sm:shrink-0"
        alt={t("website.ph.events.image")}
      />
      <div className="flex flex-1 flex-col gap-2.5">
        <div className="flex items-center gap-3">
          {row.hue ? (
            <span
              aria-hidden
              className="h-7 w-1 shrink-0 rounded-full"
              style={{ background: `var(--hue-${row.hue}-500)` }}
            />
          ) : null}
          <T
            value={row.title}
            as="h3"
            at={row.at ? `${row.at}.title` : undefined}
            site={site}
            className={SUBHEAD}
            placeholder={t("website.ph.events.title")}
          />
        </div>
        <Detail row={row} site={site} />
        <P
          value={row.body}
          at={row.at ? `${row.at}.body` : undefined}
          site={site}
          className={`${BODY} text-[var(--s-muted)]`}
          placeholder={t("website.ph.events.body")}
        />
      </div>
      <div className="sm:shrink-0">
        <RowAction row={row} site={site} stretch />
      </div>
    </li>
  );
}

function FeaturedRow({ row, site }: { row: Row; site: SiteCtx }) {
  return (
    <Card className="relative grid overflow-hidden lg:grid-cols-2" pad={false}>
      <Pic
        value={row.image}
        at={row.at ? `${row.at}.image` : undefined}
        site={site}
        ratio="16 / 10"
        sizes="(min-width: 1024px) 50vw, 100vw"
        priority
        className="lg:h-full"
        alt={t("website.ph.events.image")}
      />
      <div className="flex flex-col justify-center gap-4 p-7 sm:p-10">
        <Hue hue={row.hue} className="h-1.5 w-10 rounded-full" />
        <T
          value={row.title}
          as="h3"
          at={row.at ? `${row.at}.title` : undefined}
          site={site}
          className={SUBHEAD}
          placeholder={t("website.ph.events.title")}
        />
        <Detail row={row} site={site} />
        <P
          value={row.body}
          at={row.at ? `${row.at}.body` : undefined}
          site={site}
          className={`${BODY} text-[var(--s-muted)]`}
          placeholder={t("website.ph.events.body")}
        />
        <RowAction row={row} site={site} stretch />
      </div>
    </Card>
  );
}

export function EventsSection({ section, site }: SectionViewProps) {
  const content = section.content;
  const bound = section.bind?.source === "events";
  const rows = bound
    ? boundRows(site, section.bind?.source === "events" ? section.bind.limit : 3)
    : manualRows(content);
  const centred = section.style?.align === "centre";
  const variant = section.variant;

  const body = rows.length === 0
    ? <NothingYet site={site}>{t("website.empty.events")}</NothingYet>
    : variant === "list"
      ? (
        <ul
          className={
            "m-0 flex list-none flex-col divide-y p-0"
            + " [border-color:var(--s-line)] [&>li]:[border-color:var(--s-line)]"
          }
        >
          {rows.map((row) => <ListRow key={row.key} row={row} site={site} />)}
        </ul>
      )
      : variant === "featured"
        ? (
          <div className="flex flex-col gap-[calc(var(--s-gap)*1.1)]">
            {rows[0] ? <FeaturedRow row={rows[0]} site={site} /> : null}
            {rows.length > 1 ? (
              <Grid columns={3}>
                {rows.slice(1).map((row) => (
                  <CardRow key={row.key} row={row} site={site} />
                ))}
              </Grid>
            ) : null}
          </div>
        )
        : (
          <Grid columns={3}>
            {rows.map((row, index) => (
              <CardRow key={row.key} row={row} site={site} priority={index === 0} />
            ))}
          </Grid>
        );

  return (
    <Band id={section.id} style={section.style} site={site}>
      <Inner wide>
        <div className="flex flex-col gap-[calc(var(--s-gap)*1.6)]">
          <Head content={content} site={site} centred={centred} />
          {body}
          <Btns className={`empty:hidden ${centred ? "justify-center" : ""}`}>
            <Btn value={linkOf(content["action"])} at="action" site={site} />
          </Btns>
        </div>
      </Inner>
    </Band>
  );
}
