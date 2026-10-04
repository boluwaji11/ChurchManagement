"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { Banner, Combobox, Field, IconButton, Input } from "@hearth/ui";
import { PhoneInput } from "@/components/phone-input";
import { FormActions } from "@/components/form-actions";
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
  logo,
  editing,
  onEditing,
}: {
  values: ChurchValues;
  canEdit: boolean;
  /** R1.1. The logo row, which opens this section. */
  logo?: React.ReactNode;
  /** Held by the page, because the pencil here opens every section. */
  editing: boolean;
  onEditing: (next: boolean) => void;
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
      if (!result.error) onEditing(false);
    });
  };



  return (
    <div className="flex flex-col gap-5" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("church.title")}>{error}</Banner> : null}
      {saved && !error ? <Banner tone="success" title={t("church.saved")} /> : null}

      {/* R1.1. The design lays these out as a grid that fills the room it has
          rather than two fixed columns, so a wide screen reads three across. */}
      <section className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-5">
        {/* The mark and the name read as the heading of the card, the way a
            person's face and name do on their own screen. */}
        <div className="flex flex-wrap items-center gap-4">
          {logo}
          <span className="min-w-0 flex-1 text-[17px] font-bold text-fg">{values.name}</span>
          {/* What commits this form sits on the card it changes, rather than
              up beside the page's own title. */}
          {editing ? (
            <FormActions
              form="church-form"
              label={t("church.save")}
              onClose={() => onEditing(false)}
            />
          ) : canEdit ? (
            <IconButton label={t("church.edit")} variant="ghost" onClick={() => onEditing(true)}>
              <Pencil />
            </IconButton>
          ) : null}
        </div>

        <hr className="border-0 border-t border-line" />

        {editing ? null : <Reading values={values} regionLabel={regionLabel} />}

        {/* The buttons that commit this form sit at the foot of the page,
            under the last section they change, so one press saves the lot. */}
        <form
          id="church-form"
          action={save}
          noValidate
          className={editing ? "flex flex-col gap-4" : "hidden"}
        >
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            <Field label={t("church.name")} required>
              <Input name="name" defaultValue={values.name} disabled={!canEdit} />
            </Field>
            <Field label={t("church.legalName")}>
              <Input name="legalName" defaultValue={values.legalName ?? ""} disabled={!canEdit} />
            </Field>
            <Field label={t("church.address")} className="[grid-column:1/-1]">
              <Input name="addressLine1" defaultValue={values.addressLine1 ?? ""} disabled={!canEdit} />
            </Field>
            <Field label={t("church.addressLine2")} className="[grid-column:1/-1]">
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
              <PhoneInput name="phone" defaultValue={values.phone ?? ""} disabled={!canEdit} />
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

        </form>
      </section>
    </div>
  );
}

/** What a field with nothing in it reads as. */
const EMPTY = "\u2014";

/**
 * A church writes "example.com" rather than a scheme, so one is put in front of
 * it to make a link. An address that already carries one is left as written.
 */
function href(website: string | null): string | undefined {
  const clean = website?.trim();
  if (!clean) return undefined;
  return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
}

/**
 * R1.1. The profile as a church reads it back.
 *
 * The same grid the form uses, so switching into editing moves nothing on the
 * screen except the boxes appearing around the words.
 */
function Reading({ values, regionLabel }: { values: ChurchValues; regionLabel: string }) {
  const rows: Array<[string, string | null, string?]> = [
    // The name is the card's own heading, beside the mark.
    [t("church.legalName"), values.legalName],
    [t("church.address"), [values.addressLine1, values.addressLine2].filter(Boolean).join(", ")],
    [t("church.city"), values.city],
    [regionLabel, values.region],
    [t("church.postalCode"), values.postalCode],
    [t("church.country"), values.country],
    [t("church.phone"), values.phone],
    [t("church.website"), values.website, href(values.website)],
    [t("church.timezone"), values.timezone.replace(/_/g, " ")],
  ];

  return (
    <dl className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
      {rows.map(([label, value, link]) => (
        <div key={label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-label text-fg-subtle">{label}</dt>
          <dd className="truncate text-[length:var(--d-text-body)] text-fg">
            {!value?.trim() ? (
              EMPTY
            ) : link ? (
              <a
                href={link}
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary underline-offset-4 hover:underline"
              >
                {value}
              </a>
            ) : (
              value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
