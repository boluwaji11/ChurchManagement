/**
 * R16.12. The sheets a church already has in its cupboard.
 *
 * Churches print far more than software vendors expect, and what they print
 * on is whatever the office supplier sells: a box of Avery sheets that has
 * been there since before the last treasurer. A product that asks a volunteer
 * to measure a label is a product they print from Word instead.
 *
 * The roll stock a check-in station uses lives in `label-stock`. This is the
 * other kind: a grid of labels on one page, which needs its margins and its
 * pitch rather than a page size.
 *
 * Measurements are the manufacturer's own, in millimetres.
 */

/* R16.12. The envelope leads: a church posting ten things writes ten
   envelopes, and a sheet of thirty labels is what it reaches for when it is
   posting to everybody. */
export const PAPERS = ["envelope", "avery5160", "averyL7160", "avery5162"] as const;
export type PaperStock = (typeof PAPERS)[number];

export interface PaperShape {
  /** What the manufacturer calls it, for the chooser. */
  name: string;
  /** What goes in `@page { size: ... }`. */
  page: string;
  /** How many across and down. One of each means an envelope. */
  columns: number;
  rows: number;
  /** The printable label itself. */
  width: number;
  height: number;
  /** From the top left of the page to the top left of the first label. */
  marginTop: number;
  marginLeft: number;
  /** Left edge to left edge, which is the label plus whatever sits between. */
  pitchX: number;
  pitchY: number;
}

export const PAPER: Record<PaperStock, PaperShape> = {
  /** 30 to a Letter sheet, the one most American churches have. */
  avery5160: {
    name: "Avery 5160",
    page: "215.9mm 279.4mm",
    columns: 3,
    rows: 10,
    width: 66.7,
    height: 25.4,
    marginTop: 12.7,
    marginLeft: 4.8,
    pitchX: 69.9,
    pitchY: 25.4,
  },
  /** 21 to an A4 sheet, the same label everywhere else in the world. */
  averyL7160: {
    name: "Avery L7160",
    page: "210mm 297mm",
    columns: 3,
    rows: 7,
    width: 63.5,
    height: 38.1,
    marginTop: 15.1,
    marginLeft: 7.2,
    pitchX: 66,
    pitchY: 38.1,
  },
  /** 14 to a Letter sheet, for an address that runs to four lines. */
  avery5162: {
    name: "Avery 5162",
    page: "215.9mm 279.4mm",
    columns: 2,
    rows: 7,
    width: 101.6,
    height: 33.9,
    marginTop: 21.4,
    marginLeft: 3.9,
    pitchX: 104.8,
    pitchY: 33.9,
  },
  /**
   * R16.12. A DL envelope, one to a page, fed through the printer.
   *
   * The address sits where a window would be, which is also where a sorting
   * office looks for it.
   */
  envelope: {
    name: "DL envelope",
    page: "220mm 110mm",
    columns: 1,
    rows: 1,
    width: 95,
    height: 40,
    marginTop: 45,
    marginLeft: 95,
    pitchX: 0,
    pitchY: 0,
  },
};

/** How many a page of this stock holds. */
export const perPage = (sheet: PaperStock): number =>
  PAPER[sheet].columns * PAPER[sheet].rows;

/**
 * R16.12. The page rules for a sheet.
 *
 * Margin zero on the page, because the grid's own offsets are measured from
 * the paper's edge: letting the browser add its own would move every label on
 * every sheet by whatever that browser thinks a margin is.
 */
export const paperCss = (sheet: PaperStock): string =>
  `@page { size: ${PAPER[sheet].page}; margin: 0; }`;
