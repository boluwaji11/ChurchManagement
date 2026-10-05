/**
 * R2.4. What a contact is, with nothing that cannot be served to a browser.
 *
 * The shapes and the labels live here rather than beside the queries, because
 * the card that draws them runs on the client and importing the query layer
 * there drags the whole database in with it.
 */

export const CONTACT_LABELS = ["home", "mobile", "work", "other"] as const;
export type ContactLabel = (typeof CONTACT_LABELS)[number];

export type ContactKind = "email" | "phone";

export interface PersonContact {
  id: string;
  kind: ContactKind;
  label: ContactLabel;
  value: string;
  isPrimary: boolean;
  /** R17.1. The address this person signs in with, which cannot be removed. */
  isSignIn: boolean;
}

export interface PersonAddress {
  id: string;
  label: ContactLabel;
  line1: string;
  line2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string;
  isPrimary: boolean;
  /** R2.4. Held by the household rather than by this person. */
  fromHousehold: boolean;
}
