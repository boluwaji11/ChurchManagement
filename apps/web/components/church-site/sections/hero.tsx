/**
 * HRT-379, R22.2. The first thing a visitor reads.
 *
 * Six layouts, because the hero is where a church's website either looks like
 * its own or looks like a template: words beside a tall picture, words over a
 * photograph, an editorial lockup on the page's own ground, a screen filled
 * top to bottom, words set on their own, and a welcome that ends in the times
 * this church gathers.
 *
 * The title is the page's `h1` in every one of them, and the only layout that
 * reads from the church's records is `times`.
 */

import { t } from "@connectapp/i18n";
import { imageOf, linkOf, richOf, textOf } from "@connectapp/db/rules";
import {
  BODY, Band, Btn, Btns, DISPLAY, EYEBROW, Inner, NothingYet, P, Pic, T,
  dayName, timeLabel, type SiteCtx, type SiteDataForView,
} from "../kit";
import type { SectionViewProps } from "../section-props";

/** The hero's own display size, which is larger than any heading below it. */
const HERO = `${DISPLAY} text-[length:var(--s-hero)]`;

/**
 * The eyebrow as it is set over a photograph.
 *
 * The same shape as the kit's, in the inherited colour rather than the theme's
 * primary, because a primary that clears 4.5:1 on the page's ground has no
 * such promise over somebody's photograph of a building.
 */
const EYEBROW_OVER =
  "m-0 font-[family-name:var(--s-body)] text-[0.78rem] font-semibold uppercase"
  + " tracking-[0.18em] opacity-90";

/** The hero's words: eyebrow, title, standfirst, buttons, note. */
function Words({
  content,
  site,
  centred,
  over,
  className = "",
}: {
  content: Record<string, unknown>;
  site: SiteCtx;
  centred?: boolean;
  /** Set over a photograph, where the colours come from the band. */
  over?: boolean;
  className?: string;
}) {
  const quiet = over ? "opacity-90" : "text-[var(--s-muted)]";
  return (
    <div
      className={
        `flex flex-col gap-[var(--s-gap)] ${centred ? "items-center text-center" : ""} ${className}`
      }
    >
      <div className={`flex flex-col gap-3 ${centred ? "items-center" : ""}`}>
        <T
          value={textOf(content["eyebrow"])}
          as="p"
          at="eyebrow"
          site={site}
          className={over ? EYEBROW_OVER : EYEBROW}
        />
        {/* The page says which welcome carries its h1, because a church can
            put a second one further down. */}
        <T
          value={textOf(content["title"])}
          as={site.owns ? "h1" : "h2"}
          at="title"
          site={site}
          className={HERO}
          placeholder={t("website.ph.hero.title")}
        />
      </div>
      <P
        value={richOf(content["body"])}
        at="body"
        site={site}
        className={`${BODY} ${quiet}`}
        style={{ maxWidth: "46ch" }}
        placeholder={t("website.ph.hero.body")}
      />
      <Btns className={centred ? "justify-center" : ""}>
        <Btn value={linkOf(content["primary"])} at="primary" site={site} />
        <Btn value={linkOf(content["secondary"])} at="secondary" site={site} tone="secondary" />
      </Btns>
      <T
        value={textOf(content["note"])}
        as="p"
        at="note"
        site={site}
        className={`${BODY} text-[0.92em] ${quiet}`}
      />
    </div>
  );
}

/** The photograph behind a hero, with a wash of the theme's ink over it. */
function Backdrop({
  content,
  site,
  over,
}: {
  content: Record<string, unknown>;
  site: SiteCtx;
  over: boolean;
}) {
  return (
    <>
      <Pic
        value={imageOf(content["image"])}
        at="image"
        site={site}
        className="absolute inset-0 -z-10"
        sizes="100vw"
        priority
        alt={t("website.ph.hero.image")}
      />
      {over ? (
        <span
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(to top, color-mix(in srgb, var(--s-ink) 78%, transparent),"
              + " color-mix(in srgb, var(--s-ink) 34%, transparent))",
          }}
        />
      ) : null}
    </>
  );
}

/** The strip of service times the `times` hero ends on. */
function TimesStrip({
  services,
  site,
}: {
  services: SiteDataForView["services"];
  site: SiteCtx;
}) {
  if (services.length === 0) {
    return <NothingYet site={site}>{t("website.empty.times")}</NothingYet>;
  }
  return (
    <div
      className={
        "grid gap-[var(--s-gap)] border-t pt-[calc(var(--s-gap)*1.1)]"
        + " [border-color:var(--s-line)] sm:grid-cols-2 lg:grid-cols-3"
      }
    >
      {services.map((service, index) => (
        <div key={`${service.name}-${index}`} className="flex flex-col gap-1.5">
          {service.name ? <p className={EYEBROW}>{service.name}</p> : null}
          <p className={`${DISPLAY} text-[length:var(--s-h3)] leading-[1.25]`}>
            {t("website.part.serviceAt", {
              day: dayName(service.dayOfWeek, site.country),
              time: timeLabel(service.startsAt, site.country),
            })}
          </p>
          {service.campus ? (
            <p className={`${BODY} m-0 text-[var(--s-muted)]`}>{service.campus}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function HeroSection({ section, site }: SectionViewProps) {
  const content = section.content;
  const variant = section.variant;
  /* White words need a photograph under them, so a hero still being built
     keeps the band's own colours until the picture arrives. */
  const over = Boolean(imageOf(content["image"])?.key || imageOf(content["image"])?.url);

  if (variant === "photo") {
    return (
      <Band id={section.id} style={section.style} site={site}>
        <Backdrop content={content} site={site} over={over} />
        <Inner
          wide
          className={`relative flex min-h-[58svh] items-end ${over ? "text-white" : ""}`}
        >
          <Words content={content} site={site} over={over} className="max-w-[46rem]" />
        </Inner>
      </Band>
    );
  }

  if (variant === "immersive") {
    return (
      <Band id={section.id} style={section.style} site={site}>
        <Backdrop content={content} site={site} over={over} />
        <Inner
          className={
            "relative flex min-h-[100svh] items-center justify-center py-16 "
            + (over ? "text-white" : "")
          }
        >
          <Words content={content} site={site} centred over={over} className="max-w-[44rem]" />
        </Inner>
      </Band>
    );
  }

  if (variant === "centred") {
    return (
      <Band id={section.id} style={section.style} site={site}>
        <Inner>
          <Words content={content} site={site} centred className="mx-auto max-w-[46rem]" />
        </Inner>
        <Inner wide className="mt-[calc(var(--s-pad)*0.5)]">
          <Pic
            value={imageOf(content["image"])}
            at="image"
            site={site}
            ratio="21 / 9"
            sizes="100vw"
            priority
            drawn
            className="w-full rounded-[var(--s-image-corner)]"
            alt={t("website.ph.hero.image")}
          />
        </Inner>
      </Band>
    );
  }

  if (variant === "typographic") {
    return (
      <Band id={section.id} style={section.style} site={site}>
        <Inner wide>
          <div className="flex flex-col gap-[var(--s-gap)]">
            <T
              value={textOf(content["eyebrow"])}
              as="p"
              at="eyebrow"
              site={site}
              className={EYEBROW}
            />
            <span aria-hidden className="block h-px w-full bg-[var(--s-line)]" />
            <div className="grid gap-[calc(var(--s-gap)*1.3)] lg:grid-cols-12">
              <T
                value={textOf(content["title"])}
                as={site.owns ? "h1" : "h2"}
                at="title"
                site={site}
                className={`${HERO} lg:col-span-7`}
                placeholder={t("website.ph.hero.title")}
              />
              <div className="flex flex-col gap-[var(--s-gap)] lg:col-span-4 lg:col-start-9">
                <P
                  value={richOf(content["body"])}
                  at="body"
                  site={site}
                  className={`${BODY} text-[var(--s-muted)]`}
                  placeholder={t("website.ph.hero.body")}
                />
                <Btns>
                  <Btn value={linkOf(content["primary"])} at="primary" site={site} />
                  <Btn
                    value={linkOf(content["secondary"])}
                    at="secondary"
                    site={site}
                    tone="secondary"
                  />
                </Btns>
                <T
                  value={textOf(content["note"])}
                  as="p"
                  at="note"
                  site={site}
                  className={`${BODY} text-[0.92em] text-[var(--s-muted)]`}
                />
              </div>
            </div>
          </div>
        </Inner>
      </Band>
    );
  }

  if (variant === "times") {
    const services = section.bind?.source === "serviceTimes" ? site.data.services : [];
    return (
      <Band id={section.id} style={section.style} site={site}>
        <Inner wide>
          <div className="flex flex-col gap-[calc(var(--s-pad)*0.5)]">
            <div className="grid items-center gap-[calc(var(--s-gap)*1.5)] lg:grid-cols-2">
              <Words content={content} site={site} />
              <Pic
                value={imageOf(content["image"])}
                at="image"
                site={site}
                ratio="5 / 4"
                sizes="(min-width: 1024px) 48vw, 100vw"
                priority
                className="w-full rounded-[var(--s-image-corner)]"
                alt={t("website.ph.hero.image")}
              />
            </div>
            <TimesStrip services={services} site={site} />
          </div>
        </Inner>
      </Band>
    );
  }

  /* split, and whatever a document from the future asks for. */
  return (
    <Band id={section.id} style={section.style} site={site}>
      <Inner wide>
        <div className="grid items-center gap-[calc(var(--s-gap)*1.6)] lg:grid-cols-[1.05fr_1fr]">
          <Words content={content} site={site} />
          {/* Capped, because a tall portrait on a wide screen pushes the
              welcome into the middle of an empty page and leaves the first
              screen saying almost nothing. */}
          <Pic
            value={imageOf(content["image"])}
            at="image"
            site={site}
            ratio="4 / 5"
            sizes="(min-width: 1024px) 46vw, 100vw"
            priority
            drawn
            className="w-full max-h-[min(66svh,620px)] rounded-[var(--s-image-corner)]"
            alt={t("website.ph.hero.image")}
          />
        </div>
      </Inner>
    </Band>
  );
}
