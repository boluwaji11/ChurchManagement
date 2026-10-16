/**
 * HRT-379, R22.2. The church's own photographs.
 *
 * Three compositions over one list. The pictures are the content, so the
 * layouts differ in how they hold the eye rather than in what they hold: an
 * even grid, a deliberate mosaic, and a band that scrolls sideways.
 */

import { t } from "@connectapp/i18n";
import { imagesOf } from "@connectapp/db/rules";
import { Band, Head, Inner, NothingYet, Pic } from "../kit";
import type { SectionViewProps } from "../section-props";

/**
 * Where each cell sits in the mosaic, by its place in a run of six.
 *
 * Two large squares and four small ones fill a six by two grid exactly, and
 * dense flow drops each one into the first hole that fits, so the pattern
 * repeats cleanly however many pictures a church has uploaded. Under the large
 * breakpoint every cell is a single column.
 */
const MOSAIC = [
  "lg:col-span-2 lg:row-span-2",
  "",
  "",
  "lg:col-span-2 lg:row-span-2",
  "",
  "",
] as const;

export function GallerySection({ section, site }: SectionViewProps) {
  const content = section.content;
  const pictures = imagesOf(content["items"]);
  const centred = section.style?.align === "centre";
  const variant = section.variant;

  const body = pictures.length === 0
    ? <NothingYet site={site}>{t("website.empty.gallery")}</NothingYet>
    : variant === "mosaic"
      ? (
        <div
          className={
            "grid grid-cols-1 gap-[calc(var(--s-gap)*0.7)]"
            + " lg:grid-flow-dense lg:auto-rows-[11rem] lg:grid-cols-6"
          }
        >
          {pictures.map((picture, index) => (
            <div
              key={index}
              className={`aspect-[4/3] lg:aspect-auto lg:h-full ${MOSAIC[index % 6] ?? ""}`}
            >
              <Pic
                value={picture}
                at={`items.${index}`}
                site={site}
                sizes="(min-width: 1024px) 34vw, 100vw"
                priority={index === 0}
                className="size-full rounded-[var(--s-image-corner)]"
                alt={t("website.ph.gallery.image")}
              />
            </div>
          ))}
        </div>
      )
      : variant === "strip"
        ? (
          <ul
            className={
              "m-0 flex list-none flex-col gap-[calc(var(--s-gap)*0.7)] p-0"
              + " sm:snap-x sm:snap-mandatory sm:flex-row sm:overflow-x-auto sm:pb-3"
              + " sm:[scrollbar-color:var(--s-line)_transparent] sm:[scrollbar-width:thin]"
            }
          >
            {pictures.map((picture, index) => (
              <li
                key={index}
                className="sm:w-[20rem] sm:shrink-0 sm:snap-start lg:w-[24rem]"
              >
                <Pic
                  value={picture}
                  at={`items.${index}`}
                  site={site}
                  ratio="4 / 3"
                  sizes="(min-width: 640px) 24rem, 100vw"
                  priority={index === 0}
                  className="rounded-[var(--s-image-corner)]"
                  alt={t("website.ph.gallery.image")}
                />
              </li>
            ))}
          </ul>
        )
        : (
          <div className="grid grid-cols-1 gap-[calc(var(--s-gap)*0.7)] sm:grid-cols-2 lg:grid-cols-3">
            {pictures.map((picture, index) => (
              <Pic
                key={index}
                value={picture}
                at={`items.${index}`}
                site={site}
                ratio="1 / 1"
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                priority={index === 0}
                className="rounded-[var(--s-image-corner)]"
                alt={t("website.ph.gallery.image")}
              />
            ))}
          </div>
        );

  return (
    <Band id={section.id} style={section.style} site={site}>
      <Inner wide>
        <div className="flex flex-col gap-[calc(var(--s-gap)*1.6)]">
          <Head content={content} site={site} centred={centred} />
          {body}
        </div>
      </Inner>
    </Band>
  );
}
