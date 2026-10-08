/**
 * R16.12. The typefaces a letter is set in.
 *
 * Five, named the way a church reads them off a Word menu, because the file
 * this product writes has to name a font the reader's own machine already
 * holds. A font nobody has is a letter that arrives in whatever the printer
 * felt like.
 *
 * The choice belongs to the letter rather than to a run of words in it: what
 * is stored is markdown, which carries no font, and a typeface that quietly
 * vanished between the editor and the envelope would be worse than no chooser
 * at all.
 */

export const LETTER_FONTS = [
  "inter", "georgia", "times", "garamond", "arial", "verdana",
] as const;
export type LetterFont = (typeof LETTER_FONTS)[number];

export interface LetterFace {
  /** What the chooser says, which is what Word calls it. */
  name: string;
  /** For the screen and the printed page. */
  css: string;
}

export const LETTER_FACE: Record<LetterFont, LetterFace> = {
  /**
   * The product's own face, which is what every other screen is set in and
   * what a letter is set in until somebody chooses otherwise. Word names it
   * and substitutes on a machine that does not hold it, which is why the
   * other five are faces that machine already has.
   */
  inter: { name: "Inter", css: "var(--font-inter), Inter, system-ui, sans-serif" },
  georgia: { name: "Georgia", css: "Georgia, 'Times New Roman', serif" },
  times: { name: "Times New Roman", css: "'Times New Roman', Times, serif" },
  garamond: { name: "Garamond", css: "Garamond, 'EB Garamond', Georgia, serif" },
  arial: { name: "Arial", css: "Arial, Helvetica, sans-serif" },
  verdana: { name: "Verdana", css: "Verdana, Geneva, sans-serif" },
};

/** Whatever was stored, as a face this product knows. */
export const faceOf = (key: string | null | undefined): LetterFont =>
  (LETTER_FONTS as readonly string[]).includes(key ?? "") ? (key as LetterFont) : "inter";

/**
 * R16.12. How big the letter is set.
 *
 * Four sizes in points, which is the unit a church reads off its own Word
 * menu and the unit a printer works in. Eleven is what an office letter has
 * been typed at since the typewriter gave way to the laser printer, and
 * fourteen is there for the letter going to somebody who is reading it
 * without their glasses.
 */
export const LETTER_SIZES = [10, 11, 12, 14] as const;
export type LetterSize = (typeof LETTER_SIZES)[number];

/** Whatever was stored, as a size this product sets. */
export const sizeOf = (value: number | string | null | undefined): LetterSize => {
  const want = Number(value);
  return (LETTER_SIZES as readonly number[]).includes(want) ? (want as LetterSize) : 11;
};
