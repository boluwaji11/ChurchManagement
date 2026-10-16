/**
 * HRT-379, R22.2, R13.1. What a church's giving pays for, and the way to it.
 *
 * The whole of this section is words and a link. The amount, the card and the
 * receipt all belong to the giving page the platform already serves, which runs
 * on Stripe against the church's own account, and that stays true only while
 * every route to a card detail is a link out of here.
 *
 * `hrefFor` gives nothing for a church that cannot yet take a gift, so the
 * button stays off the page until the church has connected one.
 */

import { t } from "@connectapp/i18n";
import {
  imageOf, linkOf, richOf, rowsOf, textOf, type Rich, type SiteLink,
} from "@connectapp/db/rules";
import {
  BODY, Band, Btn, Btns, Card, Grid, Head, Inner, NothingYet, P, Pic, SUBHEAD, T,
  type SiteCtx,
} from "../kit";
import type { SectionViewProps } from "../section-props";

/** One fund or one of the church's own cards. */
interface Item {
  key: string;
  /** The path its fields are edited at, or nothing for a bound fund. */
  at: string | null;
  title: string;
  /** A fund's own description, which is plain text on the record. */
  note: string;
  /** A manual card's paragraph, which carries bold, italic and links. */
  body: Rich;
}

function boundItems(site: SiteCtx): Item[] {
  return site.data.funds.map((fund) => ({
    key: fund.id,
    at: null,
    title: fund.name,
    note: fund.description ?? "",
    body: [],
  }));
}

function manualItems(content: Record<string, unknown>): Item[] {
  return rowsOf(content["items"]).map((row, index) => ({
    key: `${index}`,
    at: `items.${index}`,
    title: textOf(row["title"]),
    note: "",
    body: richOf(row["body"]),
  }));
}

function ItemBody({ item, site }: { item: Item; site: SiteCtx }) {
  if (item.at) {
    return (
      <P
        value={item.body}
        at={`${item.at}.body`}
        site={site}
        className={`${BODY} text-[var(--s-muted)]`}
        placeholder={t("website.ph.give.body")}
      />
    );
  }
  if (!item.note) return null;
  return <p className={`${BODY} m-0 text-[var(--s-muted)]`}>{item.note}</p>;
}

function ItemCard({ item, site }: { item: Item; site: SiteCtx }) {
  return (
    <Card className="flex h-full flex-col gap-3">
      <T
        value={item.title}
        as="h3"
        at={item.at ? `${item.at}.title` : undefined}
        site={site}
        className={SUBHEAD}
        placeholder={t("website.ph.give.title")}
      />
      <ItemBody item={item} site={site} />
    </Card>
  );
}

export function GiveSection({ section, site }: SectionViewProps) {
  const content = section.content;
  const bound = section.bind?.source === "funds";
  const items = bound ? boundItems(site) : manualItems(content);
  const centred = section.style?.align === "centre";
  const variant = section.variant;
  const written = linkOf(content["action"]);

  /* Bound, the button is the platform's giving page under whatever the church
     called it. Manual, it is the church's own link, edited in place. */
  const giving: SiteLink = {
    label: written?.label || t("website.part.giveNow"),
    to: { kind: "give" },
    ...(written?.tone ? { tone: written.tone } : {}),
  };
  const action = bound
    ? <Btn value={giving} site={site} />
    : <Btn value={written} at="action" site={site} />;

  const empty = items.length === 0
    ? <NothingYet site={site}>{t("website.empty.give")}</NothingYet>
    : null;

  if (variant === "split") {
    return (
      <Band id={section.id} style={section.style} site={site}>
        <Inner wide>
          <div className="grid items-center gap-[calc(var(--s-gap)*1.6)] lg:grid-cols-2">
            <Pic
              value={imageOf(content["image"])}
              at="image"
              site={site}
              ratio="4 / 3"
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="w-full rounded-[var(--s-image-corner)]"
              alt={t("website.ph.give.image")}
            />
            <div className="flex flex-col gap-[calc(var(--s-gap)*1.2)]">
              <Head content={content} site={site} centred={centred} max="46ch" />
              {empty}
              {items.length ? (
                <ul className="m-0 flex list-none flex-col gap-4 p-0">
                  {items.map((item) => (
                    <li key={item.key} className="flex flex-col gap-1.5">
                      <T
                        value={item.title}
                        as="h3"
                        at={item.at ? `${item.at}.title` : undefined}
                        site={site}
                        className={SUBHEAD}
                        placeholder={t("website.ph.give.title")}
                      />
                      <ItemBody item={item} site={site} />
                    </li>
                  ))}
                </ul>
              ) : null}
              <Btns className="empty:hidden">{action}</Btns>
            </div>
          </div>
        </Inner>
      </Band>
    );
  }

  if (variant === "cards") {
    return (
      <Band id={section.id} style={section.style} site={site}>
        <Inner wide>
          <div className="flex flex-col items-center gap-[calc(var(--s-gap)*1.6)]">
            <Head content={content} site={site} centred className="w-full" />
            {empty}
            {items.length ? (
              <Grid columns={3} className="w-full">
                {items.map((item) => <ItemCard key={item.key} item={item} site={site} />)}
              </Grid>
            ) : null}
            <Btns className="empty:hidden justify-center">{action}</Btns>
          </div>
        </Inner>
      </Band>
    );
  }

  /* The band: one strip, the ask on the left and the press on the right, with
     the funds named small underneath so the reader knows what it reaches. */
  return (
    <Band id={section.id} style={section.style} site={site}>
      <Inner wide>
        <div className="flex flex-col gap-[calc(var(--s-gap)*1.2)] lg:flex-row lg:items-center lg:justify-between lg:gap-[calc(var(--s-gap)*2)]">
          <div className="flex flex-col gap-[calc(var(--s-gap)*0.9)]">
            <Head content={content} site={site} centred={centred} max="52ch" />
            {empty}
            {items.length ? (
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {items.map((item) => (
                  <li
                    key={item.key}
                    className={
                      `${BODY} rounded-full bg-[var(--s-primary-soft)] px-3.5 py-1.5`
                      + " text-[0.9rem] font-semibold text-[var(--s-ink)]"
                    }
                  >
                    <T
                      value={item.title}
                      at={item.at ? `${item.at}.title` : undefined}
                      site={site}
                      placeholder={t("website.ph.give.title")}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <Btns className="empty:hidden lg:shrink-0">{action}</Btns>
        </div>
      </Inner>
    </Band>
  );
}
