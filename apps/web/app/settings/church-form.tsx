"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import {
  Banner, Button, Card, CardTitle, Combobox, Field, Input, Separator, HueDot,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, ALL_HUES, type Hue,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { saveChurch, addService, removeService } from "./actions";

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

export interface ServiceRow {
  id: string;
  name: string;
  dayOfWeek: number;
  startsAt: string;
}

const DAYS = [0, 1, 2, 3, 4, 5, 6];

/** Every zone the browser knows, which is the list the server checks against. */
function timezones(): string[] {
  const all = (Intl as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
  return all ? all("timeZone") : ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"];
}

const clock = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

export function ChurchForm({
  values,
  services,
  canEdit,
}: {
  values: ChurchValues;
  services: ServiceRow[];
  canEdit: boolean;
}) {
  const [timezone, setTimezone] = React.useState(values.timezone);
  const [hue, setHue] = React.useState(values.brandHue);
  const [day, setDay] = React.useState("0");
  const [error, setError] = React.useState<string>();
  const [saved, setSaved] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const zones = React.useMemo(timezones, []);
  const serviceForm = React.useRef<HTMLFormElement>(null);

  const save = (data: FormData) => {
    data.set("church", values.slug);
    data.set("timezone", timezone);
    data.set("brandHue", hue);
    startTransition(async () => {
      const result = await saveChurch(data);
      setError(result.error);
      setSaved(Boolean(result.saved));
    });
  };

  const add = (data: FormData) => {
    data.set("church", values.slug);
    data.set("dayOfWeek", day);
    startTransition(async () => {
      const result = await addService(data);
      setError(result.error);
      if (!result.error) serviceForm.current?.reset();
    });
  };

  const drop = (id: string) => {
    const data = new FormData();
    data.set("church", values.slug);
    data.set("id", id);
    startTransition(async () => {
      const result = await removeService(data);
      setError(result.error);
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
            <Field label={t("church.region")}>
              <Input name="region" defaultValue={values.region ?? ""} disabled={!canEdit} />
            </Field>
            <Field label={t("church.postalCode")}>
              <Input name="postalCode" defaultValue={values.postalCode ?? ""} disabled={!canEdit} />
            </Field>
            <Field label={t("church.country")}>
              <Input name="country" defaultValue={values.country} disabled={!canEdit} />
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
                clearLabel={t("action.cancel")}
                disabled={!canEdit}
              />
            </Field>

            <Field label={t("church.brandHue")}>
              <Select value={hue} onValueChange={setHue} disabled={!canEdit}>
                <SelectTrigger aria-label={t("church.brandHue")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_HUES.map((h) => (
                    <SelectItem key={h} value={h}>
                      <span className="flex items-center gap-2">
                        <HueDot hue={h as Hue} /> {h}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {canEdit ? (
            <div>
              <Button type="submit" disabled={pending}>{t("action.save")}</Button>
            </div>
          ) : null}
        </form>
      </Card>

      <Card>
        <CardTitle>{t("church.services")}</CardTitle>
        <Separator className="my-4" />

        <ul className="mb-4 flex flex-col gap-2">
          {services.length === 0 ? (
            <li className="text-[length:var(--d-text-body)] text-fg-muted">
              {t("church.services.none")}
            </li>
          ) : null}

          {services.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-canvas p-2.5"
            >
              <span className="text-[length:var(--d-text-body)] text-fg">{s.name}</span>
              <span className="text-caption text-fg-muted">
                {t(`day.${s.dayOfWeek}` as never)} {clock(s.startsAt)}
              </span>
              {canEdit ? (
                <Button variant="ghost" className="ml-auto" onClick={() => drop(s.id)}>
                  <X /> {t("church.services.remove")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>

        {canEdit ? (
          <form ref={serviceForm} action={add} noValidate className="flex flex-wrap items-end gap-3">
            <Field label={t("church.services.name")} className="min-w-48 flex-1">
              <Input name="name" autoComplete="off" />
            </Field>

            <div className="flex min-w-40 flex-col gap-1.5">
              <span className="text-label text-fg">{t("church.services.day")}</span>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger aria-label={t("church.services.day")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d} value={String(d)}>{t(`day.${d}` as never)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Field label={t("church.services.startsAt")} className="max-w-36">
              <Input name="startsAt" type="time" />
            </Field>

            <Button type="submit" disabled={pending}>
              <Plus /> {t("action.add")}
            </Button>
          </form>
        ) : null}
      </Card>
    </div>
  );
}
