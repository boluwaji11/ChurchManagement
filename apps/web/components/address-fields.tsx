"use client";

import * as React from "react";
import { Field, Input } from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { AddressValues } from "@/lib/address";

/**
 * R2.4. Where somebody lives, in the parts a letter needs.
 *
 * One line was enough to print a directory and not enough to post anything: a
 * church running a mail merge needs the city, the state and the postcode as
 * their own answers rather than guessed at from where the commas fell.
 */
export function AddressFields({ values }: { values: AddressValues }) {
  return (
    <>
      <Field label={t("address.line1")} className="sm:col-span-full">
        <Input name="addressLine1" defaultValue={values.line1} autoComplete="address-line1" />
      </Field>
      <Field label={t("address.line2")}>
        <Input name="addressLine2" defaultValue={values.line2} autoComplete="address-line2" />
      </Field>
      <Field label={t("address.city")}>
        <Input name="addressCity" defaultValue={values.city} autoComplete="address-level2" />
      </Field>
      <Field label={t("address.region")}>
        <Input name="addressRegion" defaultValue={values.region} autoComplete="address-level1" />
      </Field>
      <Field label={t("address.postalCode")}>
        <Input
          name="addressPostalCode"
          defaultValue={values.postalCode}
          autoComplete="postal-code"
          inputMode="numeric"
        />
      </Field>
    </>
  );
}
