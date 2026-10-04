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
  region: string;
  postalCode: string;
}

export const emptyAddress = (): AddressValues => ({
  line1: "", line2: "", city: "", region: "", postalCode: "",
});

/** The stored parts, as the five inputs want them. */
export function toAddress(parts: {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
} | null | undefined): AddressValues {
  return {
    line1: parts?.line1 ?? "",
    line2: parts?.line2 ?? "",
    city: parts?.city ?? "",
    region: parts?.region ?? "",
    postalCode: parts?.postalCode ?? "",
  };
}

/** The address as one line, for reading rather than editing. */
export const oneLineAddress = (a: AddressValues): string =>
  [a.line1, a.line2, a.city, [a.region, a.postalCode].filter(Boolean).join(" ")]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
