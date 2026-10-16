/**
 * HRT-379, R22.2. The one strong press on a page.
 *
 * A page that says everything and asks for nothing leaves a visitor at the
 * bottom with nowhere to go, so this is the section a church puts the next step
 * in: come on a service day, plan a visit, get in touch. Two buttons at most,
 * because a third turns a decision into a menu.
 */

import { imageOf, linkOf } from "@connectapp/db/rules";
import { t } from "@connectapp/i18n";
import { Band, Btn, Btns, Card, Head, Inner, Pic } from "../kit";
import type { SectionViewProps } from "../section-props";

export function CtaSection({ section, site }: SectionViewProps) {
  const content = section.content;
  const primary = linkOf(content["primary"]);
  const secondary = linkOf(content["secondary"]);
  const image = imageOf(content["image"]);
  const split = section.variant === "split";
  const centred = !split && section.style?.align !== "left";

  const actions = (
    <Btns className={centred && !split ? "justify-center" : ""}>
      <Btn value={primary} at="primary" site={site} tone="primary" />
      <Btn value={secondary} at="secondary" site={site} tone="secondary" />
    </Btns>
  );

  if (split) {
    return (
      <Band id={section.id} style={section.style} site={site}>
        <Inner wide>
          <div className="grid grid-cols-1 items-center gap-[calc(var(--s-gap)*1.4)] lg:grid-cols-2">
            <div className="flex flex-col gap-[calc(var(--s-gap)*1.1)]">
              <Head content={content} site={site} />
              {actions}
            </div>
            <Pic
              value={image}
              at="image"
              site={site}
              ratio="4 / 3"
              sizes="(min-width: 1024px) 50vw, 100vw"
              alt={t("website.ph.cta.image")}
              className="rounded-[var(--s-image-corner)]"
            />
          </div>
        </Inner>
      </Band>
    );
  }

  if (section.variant === "boxed") {
    return (
      <Band id={section.id} style={section.style} site={site}>
        <Inner>
          <Card
            className={`flex flex-col gap-[calc(var(--s-gap)*1.2)] px-6 py-10 sm:px-12 sm:py-14 ${
              centred ? "items-center text-center" : ""
            }`}
            pad={false}
          >
            <Head content={content} site={site} centred={centred} max="48ch" />
            {actions}
          </Card>
        </Inner>
      </Band>
    );
  }

  /* The band. The ground is the church's choice, so this layout is the words
     and the buttons held together across the full width. */
  return (
    <Band id={section.id} style={section.style} site={site}>
      <Inner>
        <div
          className={`flex flex-col gap-[calc(var(--s-gap)*1.2)] ${
            centred ? "items-center text-center" : ""
          }`}
        >
          <Head content={content} site={site} centred={centred} max="48ch" />
          {actions}
        </div>
      </Inner>
    </Band>
  );
}
