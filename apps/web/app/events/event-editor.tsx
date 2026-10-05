"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Plus, Trash2, Upload } from "lucide-react";
import {
  ALL_HUES, Banner, Button, Checkbox, Combobox, Field, IconButton, Input, Working,
  Dialog, DialogContent, DialogFooter,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { imageLimit } from "@/components/image-limit";
import { DateField } from "@/components/date-field";
import { TimeField } from "@/components/time-field";
import { RichText } from "@/components/rich-text";
import { AddressFields } from "@/components/address-fields";
import { FormActions } from "@/components/form-actions";
import {
  createEventFrom, saveEvent, clearEventCover, recolourEvent,
} from "./actions";

export interface EventDraft {
  id: string;
  name: string;
  description: string | null;
  hue: string;
  startsOn: string;
  startsAt: string | null;
  endsOn: string | null;
  endsAt: string | null;
  location: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  listed: boolean;
  takesRegistrations: boolean;
  registrationOpen: boolean;
  formId: string | null;
  registrationClosesOn: string | null;
  capacity: number | null;
  waitlist: boolean;
  registrationClosesAt: string | null;
}

/** A heading over a block, the same shape the group designer uses. */
function Side({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[12px] font-bold tracking-[0.06em] text-fg uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

function Flag({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <Checkbox name={name} checked={checked} onCheckedChange={(on) => onChange(on === true)} />
      <span className="text-[length:var(--d-text-body)] text-fg">{label}</span>
    </label>
  );
}

/**
 * R14.1, R14.4. An event, written down on the page it will be read on.
 *
 * The same shape as the group designer, because they are the same act: the name
 * across the top with the cover beside it, the line saying whether it is taking
 * registrations, and under it what the event is on the left with the facts
 * about it down the right. Somebody filling this in is looking at the page they
 * are making.
 */
export function EventEditor({
  church,
  event,
  coverUrl,
  forms,
}: {
  church: string;
  event?: EventDraft;
  coverUrl?: string | null;
  /** R14.5. The forms this church has, to answer at registration. */
  forms: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [hue, setHue] = React.useState(event?.hue ?? "amber");
  const [listed, setListed] = React.useState(event?.listed ?? true);
  const [takes, setTakes] = React.useState(event?.takesRegistrations ?? true);
  const [formId, setFormId] = React.useState(event?.formId ?? "");
  const [asking, setAsking] = React.useState(false);

  /*
   * R14.5. Turning registration on asks which form people answer.
   *
   * Asked here rather than left on a tab of its own, because the question only
   * exists the moment somebody says people sign up, and a tab nobody opens is
   * a question nobody answers. A church with no forms yet is sent to write one.
   */
  const wantsRegistrations = (on: boolean) => {
    setTakes(on);
    if (!on) {
      setFormId("");
      return;
    }
    if (formId) return;
    if (forms.length === 0) {
      router.push(`/forms?church=${church}`);
      return;
    }
    setAsking(true);
  };
  // Carried through untouched, so saving the designer never reopens or closes
  // registration behind the church's back.
  const registrationOpen = event?.registrationOpen ?? true;
  const [startsOn, setStartsOn] = React.useState(event?.startsOn ?? "");
  const [endsOn, setEndsOn] = React.useState(event?.endsOn ?? "");
  const [closesOn, setClosesOn] = React.useState(event?.registrationClosesOn ?? "");
  const [busy, setBusy] = React.useState(false);
  const [, startTransition] = React.useTransition();

  // Held until the event exists to hang it on, which is what makes the cover
  // editable on the way in as well as afterwards.
  const [picture, setPicture] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const file = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!picture) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(picture);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [picture]);

  const shown = preview ?? coverUrl ?? null;

  return (
    <form
      id="event-form"
      noValidate
      action={(data) => {
        data.set("church", church);
        if (event) data.set("id", event.id);
        data.set("hue", hue);

        startTransition(async () => {
          setBusy(true);
          const result = await (event ? saveEvent(data) : createEventFrom(data));
          if (result.error) {
            setBusy(false);
            setError(result.error);
            return;
          }

          const id = result.id ?? event?.id;
          if (id && picture) {
            const upload = new FormData();
            upload.set("church", church);
            upload.set("purpose", "event_cover");
            upload.set("eventId", id);
            upload.set("file", picture);
            await fetch("/api/upload", { method: "POST", body: upload });
          }
          if (id && hue !== event?.hue) await recolourEvent(id, hue, church);

          setBusy(false);
          router.push(id ? `/events/${id}?church=${church}` : `/events?church=${church}`);
        });
      }}
      className="flex flex-col gap-5"
    >
      <Working open={busy} label={t("image.uploading")} />

      {/* R14.5. Which form people answer when they register. */}
      <Dialog open={asking} onOpenChange={setAsking}>
        {/* The lookup's list is placed against its field rather than in a
            portal, so a panel that clips its overflow cuts it in half. This one
            is short enough to let it hang outside. */}
        <DialogContent
          title={t("event.questions.choose")}
          closeLabel={t("common.close")}
          className="overflow-visible"
        >
          {/*
            * A lookup rather than a list of circles: a church that has run a
            * few terms has more forms than fit in a panel, and the one it wants
            * it can name. Writing a new one sits in the panel with them, which
            * is where somebody is when they find the list does not hold it.
            */}
          {forms.length === 0 ? (
            <div className="flex flex-col items-start gap-3 py-2">
              <span className="text-[length:var(--d-text-body)] text-fg-muted">
                {t("event.questions.noForms")}
              </span>
              <button
                type="button"
                onClick={() => router.push(`/forms?church=${church}`)}
                className="cursor-pointer text-[length:var(--d-text-body)] font-semibold text-primary underline-offset-4 hover:underline"
              >
                {t("form.newOne")}
              </button>
            </div>
          ) : (
            <Combobox
              value={formId}
              onChange={setFormId}
              options={forms.map((one) => ({ value: one.id, label: one.name }))}
              placeholder={t("common.search")}
              emptyLabel={t("common.noMatch")}
              clearLabel={t("date.clear")}
              aria-label={t("event.questions.choose")}
              footer={
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    router.push(`/forms?church=${church}`);
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-[length:var(--d-text-body)] font-semibold text-primary hover:bg-sunken"
                >
                  <Plus className="size-4 shrink-0" aria-hidden />
                  {t("form.newOne")}
                </button>
              }
            />
          )}

          <DialogFooter>
            <Button type="button" onClick={() => setAsking(false)} disabled={!formId}>
              {t("action.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/*
        * The colour and the chosen picture ride hidden fields.
        *
        * Save watches the form's own values to decide whether anything has
        * changed, so a choice held only in React state is a change it cannot
        * see. Picking a colour or a cover left Save dead and the work
        * unsaveable.
        */}
      <input type="hidden" name="hue" value={hue} />
      <input type="hidden" name="cover" value={picture?.name ?? ""} />
      {error ? <Banner tone="danger" title={t("event.failed")}>{error}</Banner> : null}

      {/* Save sits at the top right, where every other edit screen puts it,
          rather than at the end of a page somebody has to scroll to reach. */}
      <div className="flex justify-end">
        <FormActions form="event-form" label={event ? t("event.save") : t("event.create")} />
      </div>

      {/* The name and when on the left, the cover beside them, the two columns
          the event's own page opens with. */}
      <div className="grid items-start gap-7 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
        <div className="flex flex-col gap-4">
          <Field
            label={t("event.name")}
            required
            className="[&>label]:text-[12px] [&>label]:font-bold [&>label]:tracking-[0.06em] [&>label]:text-fg [&>label]:uppercase"
          >
            <Input name="name" defaultValue={event?.name ?? ""} autoComplete="off" autoFocus />
          </Field>

          {/* The colour the event wears everywhere it appears. */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold tracking-[0.06em] text-fg uppercase">
              {t("event.colour")}
            </span>
            {ALL_HUES.map((one) => (
              <button
                key={one}
                type="button"
                aria-label={one}
                aria-pressed={hue === one}
                onClick={() => setHue(one)}
                className={
                  "grid size-6 cursor-pointer place-items-center rounded-full border-2 transition-colors "
                  + (hue === one ? "border-fg" : "border-transparent hover:border-line-strong")
                }
                style={{ background: `var(--hue-${one}-500)` }}
              >
                {hue === one ? (
                  <Check className="size-3.5 text-white" strokeWidth={3} aria-hidden />
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          {shown ? (
            <img src={shown} alt="" className="aspect-[16/9] w-full rounded-[14px] object-cover" />
          ) : (
            <div
              className="grid aspect-[16/9] w-full place-items-center rounded-[14px]"
              style={{
                background: `var(--hue-${hue}-tint)`,
                color: `var(--hue-${hue}-key)`,
                border: `2px dashed var(--hue-${hue}-500)`,
              }}
            >
              <div className="flex flex-col items-center gap-1.5">
                <ImagePlus className="size-7" aria-hidden />
                <span className="font-semibold">{t("event.cover")}</span>
                <span className="text-[12px]">{imageLimit("event_cover")}</span>
              </div>
            </div>
          )}

          <input
            ref={file}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => setPicture(e.target.files?.[0] ?? null)}
          />

          <Button
            type="button"
            variant="secondary"
            onClick={() => file.current?.click()}
            className="absolute right-3 bottom-3 h-[34px] min-h-0 gap-1.5 px-3 text-[13px] shadow-sm"
          >
            <Upload className="size-[15px]" aria-hidden />
            {shown ? t("event.coverChange") : t("event.cover")}
          </Button>

          {shown ? (
            <IconButton
              label={t("event.coverRemove")}
              variant="secondary"
              onClick={() => {
                setPicture(null);
                if (file.current) file.current.value = "";
                if (event && coverUrl) {
                  void clearEventCover(event.id, church).then(() => router.refresh());
                }
              }}
              className="absolute top-3 right-3 size-8 min-h-0 shadow-sm"
            >
              <Trash2 />
            </IconButton>
          ) : null}
        </div>
      </div>

      {/*
        * R14.1. What kind of event this is, on the line its page gives it.
        *
        * Two questions, and the second only exists under the first. Plenty of
        * what a church puts on is an announcement: a carol service, a working
        * bee. Those want a page and nothing else, and every place, limit and
        * question below is noise on them.
        */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-sunken px-[18px] py-3.5">
        <Flag
          name="takesRegistrations"
          label={t("event.takesRegistrations")}
          checked={takes}
          onChange={wantsRegistrations}
        />

        <span className="flex-1" />

        {takes && formId ? (
          <button
            type="button"
            onClick={() => setAsking(true)}
            className="cursor-pointer text-label font-medium text-primary underline-offset-4 hover:underline"
          >
            {forms.find((one) => one.id === formId)?.name ?? t("event.questions.choose")}
          </button>
        ) : null}

        <input type="hidden" name="formId" value={takes ? formId : ""} />

        {/*
          * Whether it is open right now is not asked here.
          *
          * This screen says what kind of event this is. Opening and closing
          * registration is something a church does to an event afterwards, and
          * the event's own page carries the button for it. Asking in both
          * places left two switches side by side that read as the same
          * question twice.
          */}
        <input
          type="hidden"
          name="registrationOpen"
          value={registrationOpen ? "true" : "false"}
        />
      </div>

      <div className="flex flex-wrap items-start gap-10">
        <div className="flex min-w-0 flex-[999_1_420px] flex-col gap-7">
          <Side label={t("event.about")}>
            <RichText
              name="description"
              defaultValue={event?.description ?? ""}
              className="max-w-[68ch]"
            />
          </Side>

          <Side label={t("event.when")}>
            <div className="grid max-w-[68ch] gap-4 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
              <Field label={t("event.starts")} required>
                <DateField name="startsOn" defaultValue={startsOn} onValueChange={setStartsOn} />
              </Field>
              <Field label={t("event.startTime")}>
                <TimeField name="startsAt" defaultValue={event?.startsAt ?? ""} />
              </Field>
              {/* An event that runs a weekend has an end day. One that runs an
                  evening leaves it empty and says the time instead. */}
              <Field label={t("event.ends")}>
                <DateField
                  name="endsOn"
                  defaultValue={endsOn}
                  onValueChange={setEndsOn}
                  min={startsOn || undefined}
                />
              </Field>
              <Field label={t("event.endTime")}>
                <TimeField name="endsAt" defaultValue={event?.endsAt ?? ""} />
              </Field>
            </div>
          </Side>

          <Side label={t("event.where")}>
            <div className="flex max-w-[68ch] flex-col gap-4">
              <Field label={t("event.location")}>
                <Input name="location" defaultValue={event?.location ?? ""} autoComplete="off" />
              </Field>
              <AddressFields
                values={{
                  line1: event?.addressLine1 ?? "",
                  line2: event?.addressLine2 ?? "",
                  city: event?.city ?? "",
                  region: event?.region ?? "",
                  postalCode: event?.postalCode ?? "",
                  country: event?.country ?? "",
                }}
              />
            </div>
          </Side>
        </div>

        {/* The rule separates what the event is from the facts about it. */}
        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-7 border-line md:border-l md:pl-8">
          {takes ? (
          <Side label={t("event.registration")}>
            <div className="flex flex-col gap-4">
              <Field label={t("event.capacity")}>
                <Input
                  name="capacity"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  defaultValue={event?.capacity ?? ""}
                  autoComplete="off"
                />
              </Field>
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(130px,1fr))]">
                <Field label={t("event.closesOn")}>
                  <DateField
                    name="registrationClosesOn"
                    defaultValue={closesOn}
                    onValueChange={setClosesOn}
                    max={endsOn || startsOn || undefined}
                  />
                </Field>
                <Field label={t("event.closesAt")}>
                  <TimeField
                    name="registrationClosesAt"
                    defaultValue={event?.registrationClosesAt ?? ""}
                  />
                </Field>
              </div>
            </div>
          </Side>
          ) : null}

          <Side label={t("event.page")}>
            <Flag
              name="listed"
              label={t("event.listed")}
              checked={listed}
              onChange={setListed}
            />
          </Side>

        </aside>
      </div>

    </form>
  );
}
