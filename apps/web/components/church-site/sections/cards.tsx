/**
 * HRT-379, R22.2. A set of cards, for whatever a church needs a set of cards
 * for.
 *
 * The kinds above this one each know what they hold: values, people, events,
 * ministries. This one holds nothing in particular, which is why it is here. A
 * church with three things to say that are not any of those writes them as
 * three cards, with a title, a paragraph, a picture and somewhere to go.
 */

import { imageOf, linkOf, richOf, rowsOf, textOf } from "@connectapp/db/rules";
import { t } from "@connectapp/i18n";
import {
  Band, BODY, Btn, Btns, Card, Grid, Head, Inner, NothingYet, P, Pic, SUBHEAD,
  T, type SiteCtx,
} from "../kit";
import type { SectionViewProps } from "../section-props";

const COLUMNS: Record<string, 2 | 3 | 4> = {
  twoCards: 2,
  threeCards: 3,
  fourCards: 4,
};

/** A wider card can carry a wider picture, so the ratio follows the count. */
const RATIO: Record<string, string> = {
  twoCards: "16 / 10",
  threeCards: "3 / 2",
  fourCards: "4 / 3",
};

function OneCard({
  row,
  index,
  site,
  ratio,
  sizes,
}: {
  row: Record<string, unknown>;
  index: number;
  site: SiteCtx;
  ratio: string;
  sizes: string;
}) {
  const action = linkOf(row["action"]);
  return (
    <Card className="flex h-full flex-col overflow-hidden" pad={false}>
      <Pic
        value={imageOf(row["image"])}
        at={`items.${index}.image`}
        site={site}
        ratio={ratio}
        sizes={sizes}
        alt={t("website.ph.cards.image")}
      />
      <div className="flex flex-1 flex-col gap-3 p-6 sm:p-7">
        <T
          value={textOf(row["title"])}
          as="h3"
          at={`items.${index}.title`}
          site={site}
          className={SUBHEAD}
        />
        <P
          value={richOf(row["body"])}
          at={`items.${index}.body`}
          site={site}
          className={`${BODY} text-[var(--s-muted)]`}
        />
        {action ? (
          <Btns className="mt-auto pt-2">
            <Btn value={action} at={`items.${index}.action`} site={site} tone="quiet" />
          </Btns>
        ) : null}
      </div>
    </Card>
  );
}

export function CardsSection({ section, site }: SectionViewProps) {
  const content = section.content;
  const rows = rowsOf(content["items"]);
  const centred = section.style?.align === "centre";
  const columns = COLUMNS[section.variant] ?? 3;
  const ratio = RATIO[section.variant] ?? "3 / 2";
  const sizes = columns === 2
    ? "(min-width: 640px) 50vw, 100vw"
    : columns === 3
      ? "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      : "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw";

  return (
    <Band id={section.id} style={section.style} site={site}>
      <Inner wide={columns > 2}>
        <div
          className={`flex flex-col gap-[calc(var(--s-gap)*1.3)] ${
            centred ? "items-center text-center" : ""
          }`}
        >
          <Head content={content} site={site} centred={centred} />
          {rows.length === 0 ? (
            <NothingYet site={site}>{t("website.empty.cards")}</NothingYet>
          ) : (
            <Grid columns={columns} className="w-full text-left">
              {rows.map((row, index) => (
                <OneCard
                  key={index}
                  row={row}
                  index={index}
                  site={site}
                  ratio={ratio}
                  sizes={sizes}
                />
              ))}
            </Grid>
          )}
        </div>
      </Inner>
    </Band>
  );
}
