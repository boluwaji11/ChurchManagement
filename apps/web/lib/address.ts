/**
 * R2.4. Where somebody lives, in the parts a letter needs.
 *
 * Plain functions in their own module so a server component can shape a stored
 * address without importing the client component that draws it.
 */
export interface AddressValues {
  line1: string;
  line2: string;
  city: string;
  /** The state, province or county, by whatever the country calls it. */
  region: string;
  postalCode: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
}

export const emptyAddress = (): AddressValues => ({
  line1: "", line2: "", city: "", region: "", postalCode: "", country: "US",
});

/** The stored parts, as the five inputs want them. */
export function toAddress(parts: {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
} | null | undefined): AddressValues {
  return {
    line1: parts?.line1 ?? "",
    line2: parts?.line2 ?? "",
    city: parts?.city ?? "",
    region: parts?.region ?? "",
    postalCode: parts?.postalCode ?? "",
    country: parts?.country || "US",
  };
}

/**
 * The address as one line, for reading rather than editing.
 *
 * The country is left off where it is the one the church is in, because a
 * directory that prints "United States" under every address is printing nothing.
 */
export const oneLineAddress = (a: AddressValues, home = "US"): string =>
  [
    a.line1,
    a.line2,
    a.city,
    [a.region, a.postalCode].filter(Boolean).join(" "),
    a.country && a.country !== home ? a.country : "",
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
