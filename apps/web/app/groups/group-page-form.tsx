"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Banner, Checkbox, Field, Input, Textarea,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { TimeField } from "@/components/time-field";
import { Picker } from "@/components/picker";
import { FormActions } from "@/components/form-actions";
import { create, save } from "./actions";
import type { GroupDraft, GroupTypeOption } from "./group-form";

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const FREQUENCIES = ["weekly", "fortnightly", "monthly"] as const;
const AUDIENCES = [
  "anyone", "men", "women", "young_adults", "students", "parents", "seniors",
] as const;

const dayName = (day: number) =>
  new Date(2024, 0, 7 + day).toLocaleDateString("en-US", { weekday: "long" });

/** One section of the form: a bold heading and a grid under it. */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5">
      <span className="text-[15px] font-bold text-fg">{title}</span>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        {children}
      </div>
    </section>
  );
}

/** A switch and its words, on a line of its own. */
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
    <label className="flex cursor-pointer items-center gap-3 [grid-column:1/-1]">
      <Checkbox name={name} checked={checked} onCheckedChange={(on) => onChange(on === true)} />
      <span className="text-[length:var(--d-text-body)] text-fg">{label}</span>
    </label>
  );
}

/**
 * R9.1, R9.2. Writing a group down, on a page of its own.
 *
 * The same four questions a group's page answers, in the same order: what it
 * is, when and where it meets, who it is for, and who may see it. A dialog with
 * fourteen fields in it is a dialog nobody reads the bottom of.
 */
export function GroupPageForm({
  church,
  types,
  group,
}: {
  church: string;
  types: GroupTypeOption[];
  /** Given when an existing group is being changed. */
  group?: GroupDraft;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [online, setOnline] = React.useState(group?.online ?? false);
  const [childrenWelcome, setChildren] = React.useState(group?.childrenWelcome ?? false);
  const [openToJoin, setOpenToJoin] = React.useState(group?.openToJoin ?? true);
  const [listed, setListed] = React.useState(group?.listed ?? true);
  const [, startTransition] = React.useTransition();

  return (
    <form
      id="group-form"
      noValidate
      action={(data) => {
        data.set("church", church);
        if (group) data.set("id", group.id);
        startTransition(async () => {
          const result = await (group ? save(data) : create(data));
          setError(result.error);
          if (!result.error) {
            router.push(
              result.id
                ? `/groups/${result.id}?church=${church}`
                : `/groups?church=${church}`,
            );
          }
        });
      }}
      className="flex flex-col gap-5"
    >
      {error ? <Banner tone="danger" title={t("groups.failed")}>{error}</Banner> : null}

      <Card title={t("groups.section.what")}>
        <Field label={t("groups.name")} required className="[grid-column:1/-1]">
          <Input name="name" defaultValue={group?.name ?? ""} autoComplete="off" autoFocus />
        </Field>

        <Field label={t("groups.type")}>
          <Picker
            name="typeId"
            defaultValue={group?.typeId ?? null}
            options={types.map((one) => ({ value: one.id, label: one.name }))}
            label={t("groups.type")}
          />
        </Field>

        <Field label={t("groups.forWhom")}>
          <Picker
            name="forWhom"
            defaultValue={group?.forWhom ?? null}
            options={AUDIENCES.map((a) => ({
              value: a,
              label: t(`groups.audience.${a}` as never),
            }))}
            label={t("groups.forWhom")}
          />
        </Field>

        <Field label={t("groups.description")} className="[grid-column:1/-1]">
          <Textarea name="description" rows={3} defaultValue={group?.description ?? ""} />
        </Field>
      </Card>

      <Card title={t("groups.section.when")}>
        <Field label={t("groups.day")}>
          <Picker
            name="dayOfWeek"
            defaultValue={
              group?.dayOfWeek === null || group?.dayOfWeek === undefined
                ? null
                : String(group.dayOfWeek)
            }
            options={DAYS.map((d) => ({ value: String(d), label: dayName(d) }))}
            label={t("groups.day")}
          />
        </Field>

        <Field label={t("groups.frequency")}>
          <Picker
            name="frequency"
            defaultValue={group?.frequency ?? null}
            options={FREQUENCIES.map((f) => ({
              value: f,
              label: t(`groups.frequency.${f}` as never),
            }))}
            label={t("groups.frequency")}
          />
        </Field>

        <Field label={t("groups.time")}>
          <TimeField name="startsAt" defaultValue={group?.startsAt ?? ""} />
        </Field>

        <Field label={t("groups.endsAt")}>
          <TimeField name="endsAt" defaultValue={group?.endsAt ?? ""} />
        </Field>
      </Card>

      <Card title={t("groups.section.where")}>
        <Field label={t("groups.location")}>
          <Input name="location" defaultValue={group?.location ?? ""} autoComplete="off" />
        </Field>

        <Field label={t("groups.address")}>
          <Input name="address" defaultValue={group?.address ?? ""} autoComplete="off" />
        </Field>

        <Flag
          name="online"
          label={t("groups.online")}
          checked={online}
          onChange={setOnline}
        />
      </Card>

      <Card title={t("groups.section.who")}>
        <Field label={t("groups.capacity")}>
          <Input
            name="capacity"
            inputMode="numeric"
            defaultValue={
              group?.capacity === null || group?.capacity === undefined
                ? ""
                : String(group.capacity)
            }
          />
        </Field>

        <Flag
          name="childrenWelcome"
          label={t("groups.childrenWelcome")}
          checked={childrenWelcome}
          onChange={setChildren}
        />
        <Flag
          name="openToJoin"
          label={t("groups.openToJoin")}
          checked={openToJoin}
          onChange={setOpenToJoin}
        />
        <Flag
          name="listed"
          label={t("groups.listed")}
          checked={listed}
          onChange={setListed}
        />
      </Card>
    </form>
  );
}

/** The one button that commits it, for the page's own corner. */
export function GroupFormActions({ editing }: { editing: boolean }) {
  return (
    <FormActions
      form="group-form"
      label={editing ? t("action.save") : t("groups.create")}
    />
  );
}
