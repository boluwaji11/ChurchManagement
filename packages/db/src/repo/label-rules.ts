/**
 * R8.11. What goes on a child's label, and the stock it prints on.
 *
 * Pure, because the label a station prints with no network has to be the same
 * label it prints with one.
 */

/** The stock a church loads. Width and height are in inches. */
export const LABEL_SIZES = {
  brother_24x11: { width: 2.4, height: 1.1 },
  dymo_225x125: { width: 2.25, height: 1.25 },
  zebra_2x1: { width: 2, height: 1 },
} as const;

export type LabelSize = keyof typeof LABEL_SIZES;

export interface LabelLayout {
  showRoom: boolean;
  showAllergies: boolean;
  showCode: boolean;
  showService: boolean;
  parentTag: boolean;
  size: LabelSize;
}

export const DEFAULT_LABEL_LAYOUT: LabelLayout = {
  showRoom: true,
  showAllergies: true,
  showCode: true,
  showService: true,
  parentTag: true,
  size: "brother_24x11",
};
