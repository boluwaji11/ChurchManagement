"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, Pencil, RefreshCw, Trash2 } from "lucide-react";
import {
  Avatar, Banner, Button, DatePicker, Dialog, DialogContent, DialogFooter, DialogTrigger,
  Field, IconButton, Input, Working,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { imageLimit } from "@/components/image-limit";
import { PhoneInput } from "@/components/phone-input";
import { FormActions, BackToView } from "@/components/form-actions";
import { longDate } from "@/lib/dates";
import { AddressFields } from "@/components/address-fields";
import { Picker } from "@/components/picker";
import { oneLineAddress, type AddressValues } from "@/lib/address";
import { maritalOptions, schoolOptions } from "@/lib/person-input";
import { saveProfile, clearPhoto } from "./actions";

/** The date picker's words, said once rather than at every call. */
const DATE_LABELS = () => ({
  open: t("date.open"),
  clear: t("date.clear"),
  previousMonth: t("date.previousMonth"),
  nextMonth: t("date.nextMonth"),
  month: t("date.month"),
  year: t("date.year"),
  today: t("date.today"),
});

export interface ProfileValues {
  personId: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  /** R2.4. Where they live, in the parts a letter needs. */
  address: AddressValues;
  maritalStatus: string | null;
  schoolLevel: string | null;
  anniversary: string;
  campusId: string | null;
}

export interface CampusChoice {
  id: string;
  name: string;
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
  photoUrl,
  values,
  campuses,
}: {
  church: string;
  /** The address this person signs in with, which changes under Security. */
  signedInAs: string;
  photoUrl: string | null;
  values: ProfileValues;
  /** R1.2. Offered only where this church has more than one. */
  campuses: CampusChoice[];
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [busy, setBusy] = React.useState(false);
  const [dropping, setDropping] = React.useState(false);
  const [showing, setShowing] = React.useState(false);
  const [birthday, setBirthday] = React.useState(values.dateOfBirth);
  const [anniversary, setAnniversary] = React.useState(values.anniversary);
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
        {/* The way back to reading it, where this card is being edited. */}
        {editing ? (
          <BackToView form="profile-form" onBack={() => setEditing(false)} />
        ) : null}

        {/* R17.1. The face is the control. With a photo on it, pressing opens
            it big enough to look at, with the two things anybody wants to do
            to it. With none, it goes straight to the file picker, because a
            box asking whether to add a photo before asking which one is a
            press nobody needed. */}
        {photoUrl ? (
          <Dialog open={showing} onOpenChange={setShowing}>
            <DialogTrigger asChild>
              <button
                type="button"
                aria-label={t("profile.photo.title")}
                className="group relative shrink-0 cursor-pointer rounded-full"
              >
                <img
                  src={photoUrl}
                  alt=""
                  className="size-14 rounded-full border border-line object-cover"
                />
                <span className="absolute inset-0 grid place-items-center rounded-full bg-fg/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Camera className="size-5 text-surface" aria-hidden />
                </span>
              </button>
            </DialogTrigger>

            {/* No heading over it. The picture is the whole content, and the
                words "Your photo" above somebody's face say nothing. */}
            <DialogContent title={t("profile.photo.title")} hideTitle closeLabel={t("common.close")}>
              <img
                src={photoUrl}
                alt=""
                className="max-h-[60vh] w-full rounded-lg bg-canvas object-contain"
              />
              <DialogFooter>
                {/* What a replacement may be, read where somebody is about to
                    choose one rather than beside their name on the record. */}
                <span className="mr-auto text-[12px] text-fg-subtle">
                  {imageLimit("person_photo")}
                </span>
                <IconButton
                  label={t("profile.photo.remove")}
                  variant="ghost"
                  // The photograph stays open behind the question, so the
                  // thing being removed is still on screen while it is asked
                  // about.
                  onClick={() => setDropping(true)}
                >
                  <Trash2 />
                </IconButton>
                <IconButton
                  label={t("profile.photo.replace")}
                  variant="ghost"
                  onClick={() => file.current?.click()}
                >
                  <RefreshCw />
                </IconButton>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          /* With no photo the press goes straight to the file picker, so what
             a picture may be is said here rather than in a panel that never
             opens. The caption sits under the initials in a column of its own,
             which leaves the name and the actions beside it where they were. */
          <span className="flex shrink-0 flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => file.current?.click()}
              aria-label={t("profile.photo.add")}
              className="group relative cursor-pointer rounded-full"
            >
              <Avatar name={display} id={values.personId} className="size-14 text-[18px] font-semibold" />
              <span className="absolute inset-0 grid place-items-center rounded-full bg-fg/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <Camera className="size-5 text-surface" aria-hidden />
              </span>
            </button>
            <span className="text-center text-[11px] leading-tight text-fg-subtle">
              {imageLimit("person_photo")}
            </span>
          </span>
        )}

        <Dialog open={dropping} onOpenChange={setDropping}>
          <DialogContent alert title={t("profile.photo.remove")}>
            <p className="text-[length:var(--d-text-body)] text-fg-muted">
              {t("profile.photo.removeBody")}
            </p>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDropping(false)}>
                {t("profile.photo.keep")}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() =>
                  startTransition(async () => {
                    setDropping(false);
                    const result = await clearPhoto(church);
                    setError(result.error);
                    if (!result.error) {
                      setShowing(false);
                      router.refresh();
                    }
                  })}
              >
                <Trash2 /> {t("profile.photo.remove")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

        {editing ? (
          <FormActions
            form="profile-form"
            label={t("settings.profile.save")}
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
            // The name is the card's own heading, beside the face.
            [t("settings.profile.phone"), values.phone],
            [
              t("settings.profile.birthday"),
              values.dateOfBirth ? longDate(values.dateOfBirth) : "",
            ],
            [t("person.address"), oneLineAddress(values.address)],
            [
              t("person.maritalStatus"),
              values.maritalStatus ? t(`marital.${values.maritalStatus}` as never) : "",
            ],
            [t("person.anniversary"), values.anniversary ? longDate(values.anniversary) : ""],
            [
              t("person.schoolLevel"),
              values.schoolLevel ? t(`school.${values.schoolLevel}` as never) : "",
            ],
            ...(campuses.length > 1
              ? [[
                  t("person.campus"),
                  campuses.find((one) => one.id === values.campusId)?.name ?? "",
                ] as [string, string]]
              : []),
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
              name="dateOfBirth"
              value={birthday}
              onChange={setBirthday}
              placeholder={t("date.placeholder")}
              labels={DATE_LABELS()}
            />
          </Field>

          <AddressFields values={values.address} />

          <Field label={t("person.maritalStatus")}>
            <Picker
              name="maritalStatus"
              defaultValue={values.maritalStatus}
              options={maritalOptions()}
              label={t("person.maritalStatus")}
            />
          </Field>

          <Field label={t("person.anniversary")}>
            <DatePicker
              name="anniversary"
              value={anniversary}
              onChange={setAnniversary}
              placeholder={t("date.placeholder")}
              labels={DATE_LABELS()}
            />
          </Field>

          <Field label={t("person.schoolLevel")}>
            <Picker
              name="schoolLevel"
              defaultValue={values.schoolLevel}
              options={schoolOptions()}
              label={t("person.schoolLevel")}
            />
          </Field>

          {campuses.length > 1 ? (
            <Field label={t("person.campus")}>
              <Picker
                name="campusId"
                defaultValue={values.campusId}
                options={campuses.map((one) => ({ value: one.id, label: one.name }))}
                label={t("person.campus")}
              />
            </Field>
          ) : null}
        </div>
      </form>

    </div>
  );
}
