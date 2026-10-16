/**
 * HRT-379, R22.2. A paragraph and a photograph.
 *
 * The workhorse of a church's About page, in four arrangements: the picture
 * beside the words on either hand, a wide picture above them, and a card of
 * words lifted over the top edge of the picture.
 *
 * The heading comes first in the markup in every arrangement, so the order a
 * screen reader reads is the order the page means, whichever side the
 * photograph is drawn on.
 */

import { t } from "@connectapp/i18n";
import { imageOf, linkOf } from "@connectapp/db/rules";
import { Band, Btn, Btns, Card, Head, Inner, Pic } from "../kit";
import type { SectionViewProps } from "../section-props";

export function TextImageSection({ section, site }: SectionViewProps) {
  const content = section.content;
  const image = imageOf(content["image"]);
  const action = linkOf(content["action"]);
  const variant = section.variant;

  const words = (
    <div className="flex flex-col gap-[var(--s-gap)]">
      <Head content={content} site={site} max="52ch" />
      <Btns>
        <Btn value={action} at="action" site={site} />
      </Btns>
    </div>
  );

  if (variant === "imageAbove") {
    return (
      <Band id={section.id} style={section.style} site={site}>
        <Inner wide>
          <div className="flex flex-col gap-[calc(var(--s-pad)*0.45)]">
            <Pic
              value={image}
              at="image"
              site={site}
              ratio="21 / 9"
              sizes="100vw"
              className="w-full rounded-[var(--s-image-corner)]"
              drawn
              alt={t("website.ph.textImage.image")}
            />
            {words}
          </div>
        </Inner>
      </Band>
    );
  }

  if (variant === "overlap") {
    return (
      <Band id={section.id} style={section.style} site={site}>
        <Inner wide>
          <Pic
            value={image}
            at="image"
            site={site}
            ratio="16 / 7"
            sizes="100vw"
            className="w-full rounded-[var(--s-image-corner)]"
            drawn
            alt={t("website.ph.textImage.image")}
          />
          {/* The card climbs over the picture's lower edge from the small
              breakpoint up. At telephone width it sits under it, because a
              negative margin on a narrow screen eats the photograph. */}
          <Card className="relative mt-6 sm:-mt-20 sm:w-[86%] lg:w-[64%]">
            {words}
          </Card>
        </Inner>
      </Band>
    );
  }

  const picture = (
    <Pic
      value={image}
      at="image"
      site={site}
      ratio="4 / 3"
      sizes="(min-width: 1024px) 48vw, 100vw"
      className={
        "w-full rounded-[var(--s-image-corner)]"
        + (variant === "imageLeft" ? " lg:order-first" : "")
      }
      drawn
      alt={t("website.ph.textImage.image")}
    />
  );

  /* imageRight, and imageLeft which is the same grid read the other way. */
  return (
    <Band id={section.id} style={section.style} site={site}>
      <Inner wide>
        <div className="grid items-center gap-[calc(var(--s-gap)*1.5)] lg:grid-cols-2">
          {words}
          {picture}
        </div>
      </Inner>
    </Band>
  );
}
