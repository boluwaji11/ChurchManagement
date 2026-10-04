"use client";

import * as React from "react";
import { Combobox, Field, Input } from "@hearth/ui";
import { t, countryList, subdivisionsFor, hasSubdivisions, REGION_LABEL } from "@hearth/i18n";
import type { AddressValues } from "@/lib/address";

/**
 * R2.4. Where somebody lives, in the parts a letter needs.
 *
 * One line was enough to print a directory and not enough to post anything: a
 * church running a mail merge needs the city, the region and the postcode as
 * their own answers rather than guessed at from where the commas fell.
 *
 * The same shape the church's own address uses: the country first in a
 * searchable list, and under it either the country's own subdivisions or a text
 * field where we do not hold them. Half a list is worse than asking.
 */
export function AddressFields({ values }: { values: AddressValues }) {
  const [country, setCountry] = React.useState(values.country || "US");
  const [region, setRegion] = React.useState(values.region);

  const countries = React.useMemo(() => countryList(), []);
  const regions = subdivisionsFor(country);
  const regionLabel = REGION_LABEL[country] ?? t("church.region");

  return (
    <>
      <input type="hidden" name="addressCountry" value={country} />
      <input type="hidden" name="addressRegion" value={region} />

      <Field label={t("address.line1")} className="[grid-column:1/-1]">
        <Input name="addressLine1" defaultValue={values.line1} autoComplete="address-line1" />
      </Field>
      <Field label={t("address.line2")} className="[grid-column:1/-1]">
        <Input name="addressLine2" defaultValue={values.line2} autoComplete="address-line2" />
      </Field>

      <Field label={t("address.country")}>
        <Combobox
          options={countries.map((c) => ({ value: c.code, label: c.name, keywords: c.code }))}
          value={country}
          onChange={(next) => {
            setCountry(next);
            // A state from the country you just left is wrong everywhere.
            setRegion("");
          }}
          placeholder={t("church.chooseRegion")}
          emptyLabel={t("church.noRegion")}
          clearLabel={t("date.clear")}
        />
      </Field>

      <Field label={t("address.city")}>
        <Input name="addressCity" defaultValue={values.city} autoComplete="address-level2" />
      </Field>

      <Field label={regionLabel}>
        {hasSubdivisions(country) ? (
          <Combobox
            options={regions.map((r) => ({ value: r.code, label: r.name, keywords: r.code }))}
            value={region}
            onChange={setRegion}
            placeholder={t("church.chooseRegion")}
            emptyLabel={t("church.noRegion")}
            clearLabel={t("date.clear")}
          />
        ) : (
          <Input value={region} onChange={(e) => setRegion(e.target.value)} />
        )}
      </Field>

      <Field label={t("address.postalCode")}>
        <Input
          name="addressPostalCode"
          defaultValue={values.postalCode}
          autoComplete="postal-code"
        />
      </Field>
    </>
  );
}
