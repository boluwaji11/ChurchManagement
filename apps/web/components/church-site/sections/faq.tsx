/**
 * HRT-379, R22.2. The questions a visitor has before they come.
 *
 * Built on `<details>` and `<summary>`, so it opens and closes with no script
 * of ours: a keyboard reaches each question with Tab and opens it with Enter or
 * Space, and the page works the same with JavaScript turned off. The native
 * triangle is taken off and our own chevron drawn in its place, and the open
 * question also takes a wash of the primary, so the state is carried by more
 * than one thing on screen.
 */

import { ChevronDown } from "lucide-react";
import { richOf, rowsOf, textOf } from "@connectapp/db/rules";
import { t } from "@connectapp/i18n";
import {
  Band, BODY, Head, Inner, NothingYet, P, SUBHEAD, T, type SiteCtx,
} from "../kit";
import type { SectionViewProps } from "../section-props";

function Question({
  row,
  index,
  site,
}: {
  row: Record<string, unknown>;
  index: number;
  site: SiteCtx;
}) {
  return (
    <details
      className={
        "group overflow-hidden rounded-[var(--s-corner)] [border:var(--s-card-border)]"
        + " bg-[var(--s-surface)] [box-shadow:var(--s-card-shadow)]"
        + " open:bg-[var(--s-primary-soft)]"
      }
    >
      <summary
        className={
          "flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4"
          + " [&::-webkit-details-marker]:hidden focus-visible:outline"
          + " focus-visible:outline-2 focus-visible:-outline-offset-2"
          + " focus-visible:outline-[var(--s-primary)]"
        }
      >
        <T
          value={textOf(row["title"])}
          as="h3"
          at={`items.${index}.title`}
          site={site}
          className={`${SUBHEAD} min-w-0`}
        />
        <ChevronDown
          className={
            "size-5 shrink-0 text-[var(--s-primary)] motion-safe:transition-transform"
            + " motion-safe:duration-200 group-open:rotate-180"
          }
          aria-hidden
        />
      </summary>
      <div className="px-5 pb-5">
        <P
          value={richOf(row["body"])}
          at={`items.${index}.body`}
          site={site}
          className={`${BODY} text-[var(--s-muted)]`}
        />
      </div>
    </details>
  );
}

export function FaqSection({ section, site }: SectionViewProps) {
  const content = section.content;
  const rows = rowsOf(content["items"]);
  const centred = section.style?.align === "centre";
  const twoColumn = section.variant === "twoColumn";

  return (
    <Band id={section.id} style={section.style} site={site}>
      <Inner wide={twoColumn}>
        <div
          className={`flex flex-col gap-[calc(var(--s-gap)*1.2)] ${
            centred ? "items-center text-center" : ""
          }`}
        >
          <Head content={content} site={site} centred={centred} />
          {rows.length === 0 ? (
            <NothingYet site={site}>{t("website.empty.faq")}</NothingYet>
          ) : (
            <div
              className={
                "grid w-full grid-cols-1 gap-3 text-left "
                + (twoColumn ? "lg:grid-cols-2 lg:gap-4" : "")
              }
            >
              {rows.map((row, index) => (
                <Question key={index} row={row} index={index} site={site} />
              ))}
            </div>
          )}
        </div>
      </Inner>
    </Band>
  );
}
