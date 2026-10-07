/**
 * R13.x. Money on screen.
 *
 * Held in whole cents everywhere, written out once here. A church reads its own
 * currency's symbol and its own grouping, and a treasurer reading a column
 * needs the cents even when they are zero.
 */
export function money(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/** The same, with nothing after the point, for a figure read at a glance. */
export function roundMoney(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * What somebody typed, as whole cents.
 *
 * "40", "40.00", "$1,240.50" and "1240.5" all land on the same number. Anything
 * that is not a number at all comes back null, so the caller can say so rather
 * than record a gift of zero.
 */
export function toCents(typed: string): number | null {
  const clean = typed.replace(/[^0-9.]/g, "");
  if (!clean || !/^\d*\.?\d{0,2}$/.test(clean)) return null;
  const value = Number(clean);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}
