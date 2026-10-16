/**
 * HRT-379, R22.2. One video, from the church's own storage or from a platform.
 *
 * A stored file wins when both are set, because a church that uploaded a file
 * meant the file. An address is turned into a privacy-preserving embed by
 * `websiteVideoEmbedUrl`, which refuses anything that is not YouTube or Vimeo,
 * and a refusal leaves the space holding a poster rather than throwing the page
 * away.
 *
 * Inside the editor the embed is not drawn at all. A third party's player would
 * take the presses the canvas needs and reload itself on every keystroke, so
 * the church sees its poster there and the real player on the published page.
 */

import { t } from "@connectapp/i18n";
import { imageOf, linkOf, textOf, websiteVideoEmbedUrl } from "@connectapp/db/rules";
import {
  Band, Btn, Btns, Head, Inner, NothingYet, Pic, mediaUrl, type SiteCtx,
} from "../kit";
import type { SectionViewProps } from "../section-props";

/** The same permissions the church's embedded player has always been given. */
const ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope;"
  + " picture-in-picture; web-share";

/** The frame that holds the player's shape before anything has loaded. */
const FRAME =
  "aspect-video w-full overflow-hidden rounded-[var(--s-image-corner)]"
  + " bg-[var(--s-ink-soft)]";

function embedOf(value: string): string | null {
  try {
    return websiteVideoEmbedUrl(value || null);
  } catch {
    /* A church typed something that is not a video address. It gets no embed,
       and the editor's own controls are where it is told why. */
    return null;
  }
}

function Player({ section, site }: { section: SectionViewProps["section"]; site: SiteCtx }) {
  const content = section.content;
  const stored = imageOf(content["video"]);
  const poster = imageOf(content["poster"]);
  const file = mediaUrl(stored);
  const posterUrl = mediaUrl(poster);
  const title = textOf(content["title"]) || t("website.part.watch");

  if (file) {
    return (
      <div className={FRAME}>
        <video
          src={file}
          controls
          playsInline
          preload="metadata"
          {...(posterUrl ? { poster: posterUrl } : {})}
          className="size-full"
        />
      </div>
    );
  }

  const embed = embedOf(textOf(content["embed"]));

  if (embed && !site.editing) {
    return (
      <div className={FRAME}>
        <iframe
          src={embed}
          title={title}
          loading="lazy"
          allow={ALLOW}
          allowFullScreen
          className="size-full border-0"
        />
      </div>
    );
  }

  /* Either the canvas, where the poster stands in for the embed, or a church
     that gave a poster and no source yet. An empty poster is a place to press,
     which `Pic` already draws in the site's own colours. */
  if (embed || posterUrl) {
    return (
      <Pic
        value={poster}
        at="poster"
        site={site}
        ratio="16 / 9"
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="w-full rounded-[var(--s-image-corner)]"
        alt={t("website.ph.video.image")}
      />
    );
  }

  return <NothingYet site={site}>{t("website.empty.video")}</NothingYet>;
}

export function VideoSection({ section, site }: SectionViewProps) {
  const content = section.content;
  const centred = section.style?.align === "centre";
  const variant = section.variant;
  const action = (
    <Btns className={`empty:hidden ${centred && variant !== "withText" ? "justify-center" : ""}`}>
      <Btn value={linkOf(content["action"])} at="action" site={site} />
    </Btns>
  );

  if (variant === "withText") {
    return (
      <Band id={section.id} style={section.style} site={site}>
        <Inner wide>
          <div className="grid items-center gap-[calc(var(--s-gap)*1.6)] lg:grid-cols-2">
            <div className="flex flex-col gap-[calc(var(--s-gap)*1.2)]">
              <Head content={content} site={site} max="46ch" />
              {action}
            </div>
            <Player section={section} site={site} />
          </div>
        </Inner>
      </Band>
    );
  }

  if (variant === "framed") {
    return (
      <Band id={section.id} style={section.style} site={site}>
        <Inner>
          <div className="flex flex-col gap-[calc(var(--s-gap)*1.6)]">
            <Head content={content} site={site} centred={centred} />
            <div
              className={
                "rounded-[var(--s-corner)] bg-[var(--s-surface)] p-3 sm:p-4"
                + " [border:var(--s-card-border)] [box-shadow:var(--s-card-shadow)]"
              }
            >
              <Player section={section} site={site} />
            </div>
            {action}
          </div>
        </Inner>
      </Band>
    );
  }

  return (
    <Band id={section.id} style={section.style} site={site}>
      <Inner wide>
        <div className="flex flex-col gap-[calc(var(--s-gap)*1.6)]">
          <Head content={content} site={site} centred={centred} />
          <Player section={section} site={site} />
          {action}
        </div>
      </Inner>
    </Band>
  );
}
