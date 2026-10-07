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

/** The mark a currency is written with, for a field somebody types into. */
export function currencyMark(currency = "usd"): string {
  const parts = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).formatToParts(0);
  return parts.find((part) => part.type === "currency")?.value ?? "$";
}

/**
 * What somebody is typing, grouped as they type it.
 *
 * "4563.15" reads as 4,563.15 while the cursor is still in the field, because
 * a four-figure gift with no comma is a figure somebody has to count the
 * digits of. A half-typed "45." keeps its point, and the cents stop at two.
 */
export function groupAmount(typed: string): string {
  const clean = typed.replace(/[^0-9.]/g, "");
  const [whole = "", ...rest] = clean.split(".");
  const decimals = rest.join("").slice(0, 2);

  const grouped = whole === "" ? "" : Number(whole).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });

  if (!clean.includes(".")) return grouped;
  return `${grouped}.${decimals}`;
}
