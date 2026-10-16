/**
 * HRT-379, R22.2. The paragraph a church opens with.
 *
 * Words and one action, in three shapes: a centred lockup on the reading
 * measure, a heading on one side with the paragraph on the other, and a lead
 * set large enough to be read on its own.
 */

import { t } from "@connectapp/i18n";
import { linkOf, richOf, textOf } from "@connectapp/db/rules";
import {
  BODY, Band, Btn, Btns, EYEBROW, HEADING, Head, Inner, P, T,
} from "../kit";
import type { SectionViewProps } from "../section-props";

export function IntroSection({ section, site }: SectionViewProps) {
  const content = section.content;
  const action = linkOf(content["action"]);
  const variant = section.variant;

  if (variant === "twoColumn") {
    return (
      <Band id={section.id} style={section.style} site={site}>
        <Inner wide>
          <div className="grid gap-[calc(var(--s-gap)*1.5)] lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col gap-3">
              <T
                value={textOf(content["eyebrow"])}
                as="p"
                at="eyebrow"
                site={site}
                className={EYEBROW}
              />
              <T
                value={textOf(content["title"])}
                as="h2"
                at="title"
                site={site}
                className={HEADING}
                placeholder={t("website.ph.intro.title")}
              />
            </div>
            <div className="flex flex-col gap-[var(--s-gap)]">
              <P
                value={richOf(content["body"])}
                at="body"
                site={site}
                className={`${BODY} text-[var(--s-muted)]`}
                placeholder={t("website.ph.intro.body")}
              />
              <Btns>
                <Btn value={action} at="action" site={site} />
              </Btns>
            </div>
          </div>
        </Inner>
      </Band>
    );
  }

  if (variant === "lead") {
    return (
      <Band id={section.id} style={section.style} site={site}>
        <Inner>
          <div className="flex flex-col gap-[var(--s-gap)]">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <T
                value={textOf(content["eyebrow"])}
                as="p"
                at="eyebrow"
                site={site}
                className={EYEBROW}
              />
              <T
                value={textOf(content["title"])}
                as="h2"
                at="title"
                site={site}
                className={`${BODY} font-semibold uppercase tracking-[0.1em]`}
                placeholder={t("website.ph.intro.title")}
              />
            </div>
            {/* The paragraph carries the section, so it is set at heading size
                and kept to a measure a person can read without losing a line. */}
            <P
              value={richOf(content["body"])}
              at="body"
              site={site}
              className="font-[family-name:var(--s-body)] text-[length:var(--s-h3)] leading-[1.55]"
              style={{ maxWidth: "52ch" }}
              placeholder={t("website.ph.intro.body")}
            />
            <Btns>
              <Btn value={action} at="action" site={site} tone="quiet" />
            </Btns>
          </div>
        </Inner>
      </Band>
    );
  }

  /* centred */
  return (
    <Band id={section.id} style={section.style} site={site}>
      <Inner>
        <div className="flex flex-col items-center gap-[var(--s-gap)]">
          <Head content={content} site={site} centred max="58ch" />
          <Btns className="justify-center">
            <Btn value={action} at="action" site={site} />
          </Btns>
        </div>
      </Inner>
    </Band>
  );
}
