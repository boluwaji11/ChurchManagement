"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import {
  Banner, ColourPicker, Combobox, Field, IconButton, Input,
} from "@connectapp/ui";
import { PhoneInput } from "@/components/phone-input";
import { FormActions, BackToView } from "@/components/form-actions";
import { t, countryList, subdivisionsFor, hasSubdivisions, REGION_LABEL } from "@connectapp/i18n";
import { Said } from "@/components/said";
import { saveChurch } from "./actions";
import { Details, Detail } from "./card";

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
  email: string | null;
  website: string | null;
  brandHue: string;
  /** R1.1. The colour the church picked, where it has picked one. */
  brandColor: string | null;
}

/**
 * R1.1. The eight the product ships, as colours.
 *
 * A church that has never opened this still has a hue against it, and the
 * picker works in colours, so the hue is turned into the colour it stands for
 * rather than the control opening on something nobody chose.
 */
const SPECTRUM: Record<string, string> = {
  rose: "#d4374f", amber: "#c87a0a", citron: "#8a8f12", fern: "#1e8a4c",
  teal: "#0d8694", sky: "#1877c4", indigo: "#4f46e5", violet: "#8339d9",
  coral: "#d05a2a", jade: "#118a72", orchid: "#b63a9e", clay: "#8a6248",
};

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
  const [brandColor, setBrandColor] = React.useState(
    values.brandColor || SPECTRUM[values.brandHue] || "#4f46e5",
  );
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
      {saved && !error ? (
        <Said message={t("church.saved")} onClose={() => setSaved(false)} />
      ) : null}

      {/* R1.1. The design lays these out as a grid that fills the room it has
          rather than two fixed columns, so a wide screen reads three across. */}
      <section className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-5 shadow-sm">
        {/* The mark and the name read as the heading of the card, the way a
            person's face and name do on their own screen. */}
        <div className="flex flex-wrap items-center gap-4">
          {/* The way back to reading it, where this card is being edited. */}
          {editing ? (
            <BackToView form="church-form" onBack={() => onEditing(false)} />
          ) : null}

          {logo}
          <span className="min-w-0 flex-1 text-[17px] font-bold text-fg">{values.name}</span>
          {/* What commits this form sits on the card it changes, rather than
              up beside the page's own title. */}
          {editing ? (
            <FormActions
              pending={pending}
              form="church-form"
              label={t("church.save")}
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
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
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
            <Field label={t("church.email")}>
              <Input name="email" type="email" defaultValue={values.email ?? ""} disabled={!canEdit} />
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

            {/* R1.1, R24.4. The colour the church wears wherever somebody
                outside it meets it: its giving page, the form it hands out,
                the page a group is published on, and the directory it prints.
                Any colour, because a church has one and it is rarely one of
                eight. What is drawn from it is its hue at the product's own
                lightness, so a brand cannot cost a church its contrast. */}
            <div className="flex flex-col gap-2 [grid-column:1/-1]">
              <span className="text-label text-fg">{t("church.colour")}</span>
              <input type="hidden" name="brandColor" value={brandColor} />
              <ColourPicker
                value={brandColor}
                onChange={setBrandColor}
                disabled={!canEdit}
                labels={{
                  hue: t("church.colour.hue"),
                  strength: t("church.colour.strength"),
                  hex: t("church.colour.hex"),
                  invalid: t("church.colour.invalid"),
                }}
              />
            </div>
          </div>

        </form>
      </section>
    </div>
  );
}

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
    [t("church.phone"), values.phone, values.phone?.trim() ? `tel:${values.phone.replace(/[^+\d]/g, "")}` : undefined],
    [t("church.email"), values.email, values.email?.trim() ? `mailto:${values.email.trim()}` : undefined],
    [t("church.website"), values.website, href(values.website)],
    [t("church.timezone"), values.timezone.replace(/_/g, " ")],
  ];

  return (
    <Details>
      {rows.map(([label, value, link]) => (
        <Detail key={label} label={label}>
          {!value?.trim() ? null : link ? (
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
        </Detail>
      ))}
    </Details>
  );
}
