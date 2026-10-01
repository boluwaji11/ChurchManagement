"use client";

import * as React from "react";
import { Banner, Button, Card, CardTitle, Combobox, Field, Input, Separator } from "@hearth/ui";
import { t, countryList, subdivisionsFor, hasSubdivisions, REGION_LABEL } from "@hearth/i18n";
import { saveChurch } from "./actions";

export interface ChurchValues {
  slug: string;
  name: string;
  legalName: string | null;
  timezone: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
  website: string | null;
  brandHue: string;
}

/** Every zone the browser knows, which is the list the server checks against. */
function timezones(): string[] {
  const all = (Intl as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
  return all ? all("timeZone") : ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"];
}


export function ChurchForm({
  values,
  canEdit,
}: {
  values: ChurchValues;
  canEdit: boolean;
}) {
  const [timezone, setTimezone] = React.useState(values.timezone);
  const [country, setCountry] = React.useState(values.country || "US");
  const [region, setRegion] = React.useState(values.region ?? "");
  const [error, setError] = React.useState<string>();
  const [saved, setSaved] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const zones = React.useMemo(timezones, []);
  // Named in the reader's language, sorted the way that language sorts.
  const countries = React.useMemo(() => countryList(), []);
  const regions = subdivisionsFor(country);
  const regionLabel = REGION_LABEL[country] ?? t("church.region");

  const save = (data: FormData) => {
    data.set("church", values.slug);
    data.set("timezone", timezone);
    data.set("country", country);
    data.set("region", region);
    startTransition(async () => {
      const result = await saveChurch(data);
      setError(result.error);
      setSaved(Boolean(result.saved));
    });
  };



  return (
    <div className="flex flex-col gap-6" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("church.title")}>{error}</Banner> : null}
      {saved && !error ? <Banner tone="success" title={t("church.saved")} /> : null}

      <Card>
        <CardTitle>{t("church.title")}</CardTitle>
        <Separator className="my-4" />

        <form action={save} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("church.name")} required>
              <Input name="name" defaultValue={values.name} disabled={!canEdit} />
            </Field>
            <Field label={t("church.legalName")}>
              <Input name="legalName" defaultValue={values.legalName ?? ""} disabled={!canEdit} />
            </Field>
            <Field label={t("church.address")} className="sm:col-span-2">
              <Input name="addressLine1" defaultValue={values.addressLine1 ?? ""} disabled={!canEdit} />
            </Field>
            <Field label={t("church.addressLine2")} className="sm:col-span-2">
              <Input name="addressLine2" defaultValue={values.addressLine2 ?? ""} disabled={!canEdit} />
            </Field>
            <Field label={t("church.city")}>
              <Input name="city" defaultValue={values.city ?? ""} disabled={!canEdit} />
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
                  disabled={!canEdit}
                />
              ) : (
                // A country whose regions we do not list gets a text field.
                // Half a list is worse than asking.
                <Input
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  disabled={!canEdit}
                />
              )}
            </Field>
            <Field label={t("church.postalCode")}>
              <Input name="postalCode" defaultValue={values.postalCode ?? ""} disabled={!canEdit} />
            </Field>
            <Field label={t("church.country")}>
              <Combobox
                options={countries.map((c) => ({ value: c.code, label: c.name, keywords: c.code }))}
                value={country}
                onChange={(next) => {
                  setCountry(next);
                  // A state from the country you just left is wrong everywhere.
                  setRegion("");
                }}
                placeholder={t("church.chooseCountry")}
                emptyLabel={t("church.noCountry")}
                clearLabel={t("date.clear")}
                disabled={!canEdit}
              />
            </Field>
            <Field label={t("church.phone")}>
              <Input name="phone" type="tel" defaultValue={values.phone ?? ""} disabled={!canEdit} />
            </Field>
            <Field label={t("church.website")}>
              <Input name="website" type="url" defaultValue={values.website ?? ""} disabled={!canEdit} />
            </Field>

            <Field label={t("church.timezone")} required>
              <Combobox
                options={zones.map((z) => ({ value: z, label: z.replace(/_/g, " ") }))}
                value={timezone}
                onChange={setTimezone}
                placeholder={t("church.chooseTimezone")}
                emptyLabel={t("church.noTimezone")}
                clearLabel={t("date.clear")}
                disabled={!canEdit}
              />
            </Field>
          </div>

          {canEdit ? (
            <div>
              <Button type="submit" disabled={pending}>{t("action.save")}</Button>
            </div>
          ) : null}
        </form>
      </Card>

    </div>
  );
}
