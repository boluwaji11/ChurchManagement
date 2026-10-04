"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import {
  Banner, Checkbox, Combobox, Field, Input, Textarea,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { TimeField } from "@/components/time-field";
import { Picker } from "@/components/picker";
import { FormActions } from "@/components/form-actions";
import { create, save, findPerson, join, type PersonHit } from "./actions";
import type { GroupDraft, GroupTypeOption } from "./group-form";

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const FREQUENCIES = ["weekly", "fortnightly", "monthly"] as const;
const AUDIENCES = [
  "anyone", "men", "women", "young_adults", "students", "parents", "seniors",
] as const;

const dayName = (day: number) =>
  new Date(2024, 0, 7 + day).toLocaleDateString("en-US", { weekday: "long" });

/** A heading in the right-hand column, the same as the group's own page. */
function Side({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold tracking-[0.06em] text-fg-subtle uppercase">
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
 * R9.1, R9.2. A group, written down on the page it will be read on.
 *
 * The same shape as the group's own screen: the name across the top with the
 * banner beside it, the line saying whether it is taking people, and under it
 * what the group is on the left with the facts about it down the right. Every
 * one of those is an input here. Somebody filling this in is looking at the
 * page they are making, rather than at a stack of fields that happens to
 * produce one.
 */
export function GroupEditor({
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
  const [typeId, setTypeId] = React.useState(group?.typeId ?? "");
  const [online, setOnline] = React.useState(group?.online ?? false);
  const [childrenWelcome, setChildren] = React.useState(group?.childrenWelcome ?? false);
  const [openToJoin, setOpenToJoin] = React.useState(group?.openToJoin ?? true);
  const [listed, setListed] = React.useState(group?.listed ?? true);
  const [leader, setLeader] = React.useState("");
  const [hits, setHits] = React.useState<PersonHit[]>([]);
  const [, startTransition] = React.useTransition();

  const hue = types.find((one) => one.id === typeId)?.hue ?? "sky";

  /** R9.3. Who runs it, looked up the way every other person field is. */
  const lookUp = (query: string) => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    void findPerson(query, church).then(setHits);
  };

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
          if (result.error) return;

          const id = result.id ?? group?.id;
          // A new group with a named leader gets them on its roster, because
          // "Led by" is the first thing its card will say.
          if (id && leader && !group) await join(id, leader, "leader", church);
          router.push(id ? `/groups/${id}?church=${church}` : `/groups?church=${church}`);
        });
      }}
      className="flex flex-col gap-5"
    >
      {error ? <Banner tone="danger" title={t("groups.failed")}>{error}</Banner> : null}

      {/* The name and when it meets on the left, the banner beside them, the
          same two columns the group's own page opens with. */}
      <div className="grid items-start gap-7 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
        <div className="flex flex-col gap-4">
          <Field label={t("groups.name")} required>
            <Input
              name="name"
              defaultValue={group?.name ?? ""}
              autoComplete="off"
              autoFocus
              placeholder={t("groups.namePlaceholder")}
              className="h-auto py-2 font-display text-[28px] leading-[34px]"
            />
          </Field>

          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
            <Field label={t("groups.type")}>
              <Picker
                name="typeId"
                defaultValue={group?.typeId ?? null}
                options={types.map((one) => ({ value: one.id, label: one.name }))}
                label={t("groups.type")}
                onChange={setTypeId}
              />
            </Field>

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

            <Field label={t("groups.time")}>
              <TimeField name="startsAt" defaultValue={group?.startsAt ?? ""} />
            </Field>

            <Field label={t("groups.endsAt")}>
              <TimeField name="endsAt" defaultValue={group?.endsAt ?? ""} />
            </Field>
          </div>
        </div>

        {/* The banner takes the kind's colour as soon as a kind is chosen. The
            picture itself is uploaded from the group's page, which is where the
            upload has a group to belong to. */}
        <div
          className="grid aspect-[16/9] w-full place-items-center rounded-[14px]"
          style={{ background: `var(--hue-${hue}-tint)`, color: `var(--hue-${hue}-key)` }}
        >
          <ImagePlus className="size-7 opacity-50" aria-hidden />
        </div>
      </div>

      {/* Whether it is taking people, on the line the group's page gives it. */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-sunken px-[18px] py-3.5">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: openToJoin ? "var(--hue-fern-500)" : "var(--fg-subtle)" }}
        />
        <span className="min-w-[140px] flex-1 font-medium text-fg">
          {openToJoin ? t("group.openText") : t("group.closedText")}
        </span>
        <Flag
          name="openToJoin"
          label={openToJoin ? t("groups.openToJoin") : t("group.open")}
          checked={openToJoin}
          onChange={setOpenToJoin}
        />
      </div>

      <div className="flex flex-wrap items-start gap-10">
        <div className="flex min-w-0 flex-[999_1_420px] flex-col gap-7">
          <section className="flex flex-col gap-2.5">
            <h2 className="font-display text-[24px] font-normal text-fg">{t("group.about", { name: "" }).trim()}</h2>
            <Textarea
              name="description"
              rows={5}
              defaultValue={group?.description ?? ""}
              className="max-w-[68ch]"
            />
          </section>
        </div>

        <aside className="flex flex-[1_1_260px] flex-col gap-6">
          <Side label={t("group.categories")}>
            <div className="flex flex-col gap-3">
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
              <Flag
                name="childrenWelcome"
                label={t("groups.childrenWelcome")}
                checked={childrenWelcome}
                onChange={setChildren}
              />
              <Flag
                name="online"
                label={t("groups.online")}
                checked={online}
                onChange={setOnline}
              />
              <Flag
                name="listed"
                label={t("groups.listed")}
                checked={listed}
                onChange={setListed}
              />
            </div>
          </Side>

          <Side label={t("group.schedule")}>
            <Picker
              name="frequency"
              defaultValue={group?.frequency ?? null}
              options={FREQUENCIES.map((f) => ({
                value: f,
                label: t(`groups.frequency.${f}` as never),
              }))}
              label={t("groups.frequency")}
            />
          </Side>

          {/* R9.3. Only on the way in: afterwards the roster is the Members tab,
              where a leader is changed alongside everybody else. */}
          {group ? null : (
            <Side label={t("group.leader")}>
              <Combobox
                options={hits.map((one) => ({ value: one.id, label: one.name }))}
                value={leader}
                onChange={setLeader}
                onQueryChange={lookUp}
                placeholder={t("groups.addPerson")}
                emptyLabel={t("church.noRegion")}
                clearLabel={t("date.clear")}
              />
            </Side>
          )}

          <Side label={t("group.location")}>
            <div className="flex flex-col gap-3">
              <Field label={t("groups.location")}>
                <Input name="location" defaultValue={group?.location ?? ""} autoComplete="off" />
              </Field>
              <Field label={t("groups.address")}>
                <Input name="address" defaultValue={group?.address ?? ""} autoComplete="off" />
              </Field>
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
            </div>
          </Side>
        </aside>
      </div>
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
