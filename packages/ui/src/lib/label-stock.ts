/**
 * R8.25, R8.26. The label stock a church actually owns.
 *
 * Printing goes through the browser's own print path rather than a driver or a
 * helper application, because a volunteer cannot install software on a church
 * tablet and we are not shipping a desktop agent to do it for them. What makes
 * that work is the page size: a label printer loaded with the right roll prints
 * edge to edge when the page is declared at the size of the label, and prints a
 * label in the middle of an A4 sheet when it is not.
 *
 * Three stocks, chosen per station:
 *
 * `brother` Brother QL with DK-22205 continuous 62mm tape, cut at 40mm. The
 * tape this segment owns, and the one Brother ships in the box.
 *
 * `dymo` LabelWriter with 30252 address labels, 89mm by 28mm. Short, so the
 * code sits beside the name rather than under it.
 *
 * `paper` No label printer. The pairs are tiled on a sheet with cut lines, a
 * pair of scissors and some tape, which is what a church of eighty does and is
 * a first-class answer rather than a degraded one (R8.26).
 */

export const STOCKS = ["brother", "dymo", "paper"] as const;
export type Stock = (typeof STOCKS)[number];

export interface StockShape {
  /** What goes in `@page { size: ... }`. */
  page: string;
  /** The printable label, in millimetres. */
  width: number;
  height: number;
  /** A roll prints one label a page. A sheet prints many. */
  roll: boolean;
}

export const STOCK: Record<Stock, StockShape> = {
  brother: { page: "62mm 40mm", width: 62, height: 40, roll: true },
  dymo: { page: "89mm 28mm", width: 89, height: 28, roll: true },
  paper: { page: "auto", width: 86, height: 54, roll: false },
};

export function stockOf(printer: string | null | undefined): Stock {
  return (STOCKS as readonly string[]).includes(printer ?? "") ? (printer as Stock) : "paper";
}

/**
 * The print rules for one stock.
 *
 * Written as a stylesheet rather than as classes because `@page` cannot be
 * expressed any other way, and the size of the page is the whole trick.
 */
export function printCss(stock: Stock): string {
  const shape = STOCK[stock];

  if (!shape.roll) {
    // A sheet, with room for scissors between the labels.
    return `
      @page { size: auto; margin: 10mm; }
      @media print {
        .connectapp-label { break-inside: avoid; outline: 1px dashed #999; }
      }
    `;
  }

  return `
    @page { size: ${shape.page}; margin: 0; }
    @media print {
      html, body { margin: 0; padding: 0; }
      .connectapp-label {
        width: ${shape.width}mm;
        height: ${shape.height}mm;
        break-inside: avoid;
        break-after: page;
        outline: none;
        border: none;
        border-radius: 0;
        padding: 2mm 3mm;
      }
      .connectapp-label:last-child { break-after: auto; }
    }
  `;
}
