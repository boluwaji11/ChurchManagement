/**
 * HRT-379, R22.2. An invitation to one of the church's own forms.
 *
 * The fields are not drawn here. The platform already answers
 * `/f/<church>/<form>` with the whole form, its validation, its spam check and
 * its submission path, and a second copy of that on a website page would be a
 * second thing to keep right. So this section is the words and the press: a
 * heading, a line under it, a picture where the layout carries one, and a
 * button that opens the form.
 */

import { imageOf } from "@connectapp/db/rules";
import { t } from "@connectapp/i18n";
import {
  Band, Btn, Btns, Card, Head, Inner, NothingYet, Pic,
} from "../kit";
import type { SectionViewProps } from "../section-props";

export function FormSection({ section, site }: SectionViewProps) {
  const content = section.content;
  const slug = section.bind?.source === "form" ? section.bind.formSlug : null;
  const form = slug ? site.data.forms[slug] : undefined;
  const image = imageOf(content["image"]);
  const centred = section.variant === "boxed" || section.style?.align === "centre";

  /* Nothing chosen, or a form that has since been unpublished. The church sees
     why the section is empty; a visitor is shown no button to nowhere. */
  if (!slug || !form) {
    return (
      <Band id={section.id} style={section.style} site={site}>
        <Inner>
          <div className="flex flex-col gap-[calc(var(--s-gap)*1.1)]">
            <Head content={content} site={site} centred={centred} />
            <NothingYet site={site}>{t("website.empty.form")}</NothingYet>
          </div>
        </Inner>
      </Band>
    );
  }

  const open = (
    <Btns className={centred && section.variant !== "split" ? "justify-center" : ""}>
      <Btn
        value={{ label: t("website.part.openForm"), to: { kind: "form", formSlug: slug } }}
        site={site}
      />
    </Btns>
  );

  if (section.variant === "split") {
    return (
      <Band id={section.id} style={section.style} site={site}>
        <Inner wide>
          <div className="grid grid-cols-1 items-center gap-[calc(var(--s-gap)*1.4)] lg:grid-cols-2">
            <div className="flex flex-col gap-[calc(var(--s-gap)*1.1)]">
              <Head content={content} site={site} />
              {open}
            </div>
            <Pic
              value={image}
              at="image"
              site={site}
              ratio="4 / 3"
              sizes="(min-width: 1024px) 50vw, 100vw"
              alt={t("website.ph.form.image")}
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
          <Card className="flex flex-col gap-[calc(var(--s-gap)*1.1)] text-center">
            <Head content={content} site={site} centred />
            {open}
          </Card>
        </Inner>
      </Band>
    );
  }

  return (
    <Band id={section.id} style={section.style} site={site}>
      <Inner>
        <div
          className={`flex flex-col gap-[calc(var(--s-gap)*1.1)] ${
            centred ? "items-center text-center" : ""
          }`}
        >
          <Head content={content} site={site} centred={centred} />
          {open}
        </div>
      </Inner>
    </Band>
  );
}
