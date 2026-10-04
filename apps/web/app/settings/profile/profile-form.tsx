"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar, Banner, Field, Input } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { PhoneInput } from "@/components/phone-input";
import { FormActions } from "@/components/form-actions";
import { saveProfile } from "./actions";

export interface ProfileValues {
  personId: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
}

/**
 * R17.1. Your own details, and the one place you change them.
 *
 * What is saved here is the church's record of you, so a corrected phone
 * number is corrected everywhere the church reads it rather than in a copy
 * that only this screen knows about.
 */
export function ProfileForm({
  church,
  signedInAs,
  role,
  churchName,
  values,
}: {
  church: string;
  /** The address this person signs in with, which the church does not set. */
  signedInAs: string;
  role: string;
  churchName: string;
  values: ProfileValues;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [, startTransition] = React.useTransition();

  const display = `${values.preferredName || values.firstName} ${values.lastName}`.trim();

  return (
    <form
      id="profile-form"
      noValidate
      action={(data) => {
        data.set("church", church);
        startTransition(async () => {
          const result = await saveProfile(data);
          setError(result.error);
          if (!result.error) router.refresh();
        });
      }}
      className="flex flex-col gap-5"
    >
      {error ? <Banner tone="danger" title={t("settings.profile.failed")}>{error}</Banner> : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="flex items-center gap-4">
          <Avatar name={display} id={values.personId} className="size-12 text-[16px] font-semibold" />
          <span className="flex flex-col leading-5">
            <span className="font-medium text-fg">{display}</span>
            <span className="text-[13px] text-fg-muted">{signedInAs}</span>
          </span>
        </span>

        <FormActions form="profile-form" label={t("action.save")} />
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <Field label={t("settings.profile.firstName")} required>
          <Input name="firstName" defaultValue={values.firstName} autoComplete="given-name" />
        </Field>
        <Field label={t("settings.profile.lastName")} required>
          <Input name="lastName" defaultValue={values.lastName} autoComplete="family-name" />
        </Field>
        <Field label={t("settings.profile.preferredName")}>
          <Input name="preferredName" defaultValue={values.preferredName} autoComplete="off" />
        </Field>
        <Field label={t("settings.profile.email")}>
          <Input name="email" type="email" defaultValue={values.email} autoComplete="email" />
        </Field>
        <Field label={t("settings.profile.phone")}>
          <PhoneInput name="phone" defaultValue={values.phone} />
        </Field>
        <Field label={t("settings.profile.birthday")}>
          <Input name="dateOfBirth" type="date" defaultValue={values.dateOfBirth} />
        </Field>
      </div>

      <dl className="grid gap-x-6 gap-y-2 border-t border-line pt-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        <div>
          <dt className="text-[13px] text-fg-subtle">{t("settings.profile.role")}</dt>
          <dd className="text-fg">{role}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-fg-subtle">{t("settings.profile.church")}</dt>
          <dd className="text-fg">{churchName}</dd>
        </div>
      </dl>
    </form>
  );
}
