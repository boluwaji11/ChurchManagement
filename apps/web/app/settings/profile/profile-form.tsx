"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Pencil, Trash2 } from "lucide-react";
import {
  Avatar, Banner, DatePicker, Field, IconButton, Input, Working,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { PhoneInput } from "@/components/phone-input";
import { FormActions } from "@/components/form-actions";
import { longDate } from "@/lib/dates";
import { saveProfile, clearPhoto } from "./actions";

export interface ProfileValues {
  personId: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
}

/** What a field with nothing in it reads as. */
const EMPTY = <span aria-hidden className="inline-block h-px w-3 bg-line-strong align-middle" />;

/**
 * R17.1. Your own details.
 *
 * Read first, the way the church screen reads first: somebody opening this is
 * usually checking what the church holds rather than changing it. The pencil
 * turns it into a form.
 *
 * What is saved here is the church's record of you, so a corrected phone number
 * is corrected everywhere rather than in a copy only this screen knows about.
 */
export function ProfileForm({
  church,
  signedInAs,
  role,
  churchName,
  photoUrl,
  values,
}: {
  church: string;
  /** The address this person signs in with, which changes under Security. */
  signedInAs: string;
  role: string;
  churchName: string;
  photoUrl: string | null;
  values: ProfileValues;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [busy, setBusy] = React.useState(false);
  const [birthday, setBirthday] = React.useState(values.dateOfBirth);
  const [, startTransition] = React.useTransition();
  const file = React.useRef<HTMLInputElement>(null);

  const display = `${values.firstName} ${values.lastName}`.trim();

  const upload = async (chosen: File) => {
    setBusy(true);
    setError(undefined);
    const data = new FormData();
    data.set("church", church);
    data.set("purpose", "person_photo");
    data.set("file", chosen);
    try {
      const response = await fetch("/api/upload", { method: "POST", body: data });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) setError(body.error ?? t("storage.error.failed"));
      else router.refresh();
    } catch {
      setError(t("storage.error.failed"));
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Working open={busy} label={t("profile.photo.uploading")} />

      {error ? <Banner tone="danger" title={t("settings.profile.failed")}>{error}</Banner> : null}

      <div className="flex flex-wrap items-center gap-4">
        {/* R17.1. The face is the control. Pressing it asks for a file, the
            same way the church's own mark works a screen away. */}
        <button
          type="button"
          onClick={() => file.current?.click()}
          aria-label={t("profile.photo.change")}
          className="group relative shrink-0 cursor-pointer rounded-full"
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className="size-14 rounded-full border border-line object-cover"
            />
          ) : (
            <Avatar name={display} id={values.personId} className="size-14 text-[18px] font-semibold" />
          )}
          <span className="absolute inset-0 grid place-items-center rounded-full bg-fg/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Camera className="size-5 text-surface" aria-hidden />
          </span>
        </button>

        <input
          ref={file}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            const chosen = e.target.files?.[0];
            if (chosen) void upload(chosen);
          }}
        />

        <span className="flex min-w-0 flex-1 flex-col leading-5">
          <span className="text-[17px] font-bold text-fg">{display}</span>
          <span className="truncate text-[13px] text-fg-muted">{signedInAs}</span>
        </span>

        {photoUrl ? (
          <IconButton
            label={t("profile.photo.remove")}
            variant="ghost"
            onClick={() =>
              startTransition(async () => {
                const result = await clearPhoto(church);
                setError(result.error);
                if (!result.error) router.refresh();
              })}
          >
            <Trash2 />
          </IconButton>
        ) : null}

        {editing ? (
          <FormActions
            form="profile-form"
            label={t("settings.profile.save")}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <IconButton
            label={t("settings.profile.edit")}
            variant="ghost"
            onClick={() => setEditing(true)}
          >
            <Pencil />
          </IconButton>
        )}
      </div>

      {editing ? null : (
        <dl className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {[
            [t("settings.profile.firstName"), values.firstName],
            [t("settings.profile.lastName"), values.lastName],
            [t("settings.profile.phone"), values.phone],
            [
              t("settings.profile.birthday"),
              values.dateOfBirth ? longDate(values.dateOfBirth) : "",
            ],
          ].map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-label font-semibold text-fg">{label}</dt>
              <dd className="truncate text-[length:var(--d-text-body)] text-fg">
                {value?.trim() ? value : EMPTY}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <form
        id="profile-form"
        noValidate
        action={(data) => {
          data.set("church", church);
          data.set("dateOfBirth", birthday);
          startTransition(async () => {
            const result = await saveProfile(data);
            setError(result.error);
            if (!result.error) {
              setEditing(false);
              router.refresh();
            }
          });
        }}
        className={editing ? "flex flex-col gap-4" : "hidden"}
      >
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          <Field label={t("settings.profile.firstName")} required>
            <Input name="firstName" defaultValue={values.firstName} autoComplete="given-name" />
          </Field>
          <Field label={t("settings.profile.lastName")} required>
            <Input name="lastName" defaultValue={values.lastName} autoComplete="family-name" />
          </Field>
          <Field label={t("settings.profile.phone")}>
            <PhoneInput name="phone" defaultValue={values.phone} />
          </Field>
          <Field label={t("settings.profile.birthday")}>
            <DatePicker
              value={birthday}
              onChange={setBirthday}
              placeholder={t("date.placeholder")}
              labels={{
                open: t("date.open"),
                clear: t("date.clear"),
                previousMonth: t("date.previousMonth"),
                nextMonth: t("date.nextMonth"),
                month: t("date.month"),
                year: t("date.year"),
                today: t("date.today"),
              }}
            />
          </Field>
        </div>
      </form>

      {/* R1.6. Neither of these is this person's to change, so they sit under
          the card rather than inside a form that cannot touch them. The church
          leads, because which church somebody is signed in to is the thing
          worth reading twice. */}
      <div className="flex flex-col gap-1 border-t border-line pt-4">
        <span className="text-[15px] font-bold text-fg">{t("settings.profile.church")}</span>
        <span className="text-[length:var(--d-text-body)] text-fg">{churchName}</span>
        <span className="text-[13px] text-fg-muted">
          {t("settings.profile.roleIs", { role })}
        </span>
      </div>
    </div>
  );
}
