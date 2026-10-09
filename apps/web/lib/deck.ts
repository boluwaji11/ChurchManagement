import "server-only";

/**
 * R18.10. The church's logo, carried into a deck as bytes.
 *
 * A slide cannot hold a URL to a signed object that expires in an hour, so the
 * image goes in. Anything past two megabytes is a logo somebody uploaded at
 * print resolution, and it would make the deck slower to send than to read.
 */
export async function logoData(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const answer = await fetch(url);
    if (!answer.ok) return null;
    const type = answer.headers.get("content-type") ?? "image/png";
    const bytes = Buffer.from(await answer.arrayBuffer());
    if (bytes.byteLength > 2_000_000) return null;
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

/** The slide, in inches, and the boxes measured off it. */
export const SLIDE = { w: 13.333, h: 7.5 } as const;
export const MARGIN = 0.6;
export const TITLE_H = 0.7;
export const FOOT_H = 0.45;

export const BODY = {
  x: MARGIN,
  y: MARGIN + TITLE_H,
  w: SLIDE.w - MARGIN * 2,
  h: SLIDE.h - MARGIN * 2 - TITLE_H - FOOT_H,
} as const;

export const FOOT = {
  x: MARGIN,
  y: SLIDE.h - MARGIN - FOOT_H,
  w: SLIDE.w - MARGIN * 2,
  h: FOOT_H,
} as const;
