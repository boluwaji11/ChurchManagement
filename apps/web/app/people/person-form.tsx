"use client";

import * as React from "react";
import Link from "next/link";
import {
  Avatar, Input, Field, Banner, cn,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { PhoneInput } from "@/components/phone-input";
import { DateField } from "@/components/date-field";
import { FormActions } from "@/components/form-actions";
import { t } from "@hearth/i18n";
import type { HouseholdOption } from "@hearth/db";
import {
  parsePerson, personErrors, hasErrors,
  lifecycleOptions, householdRoleOptions, HOUSEHOLD_NEW, HOUSEHOLD_NONE,
  type PersonErrors,
} from "@/lib/person-input";
import { savePerson } from "./actions";
import { CustomFieldInputs, type FieldDef, type FieldValues } from "./custom-fields";

export interface PersonFormValues {
  /** R2.4. One line, as a church writes it. */
  address?: string | null;
  id?: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string | null;
  dateOfBirth?: string | null;
  lifecycleStatus?: string;
  membershipDate?: string | null;
  firstVisitOn?: string | null;
  allergies?: string | null;
  medicalNote?: string | null;
  email?: string | null;
  phone?: string | null;
  householdId?: string | null;
  householdRole?: string;
}

/**
 * The one form for adding and editing a person.
 *
 * Add and edit are the same fields in the same order, so they are the same
 * component. Two forms drift, and the second one is always the one missing the
 * field somebody needs.
 *
 * Validation runs on submit, then follows each field as it is corrected. It does
 * not fire while someone is still typing their surname. On a failed submit the
 * first bad field takes focus, so a keyboard or screen reader user is put on the
 * problem rather than left to hunt for it.
 */
/** The design's form card: a bold heading, no rule under it. */
/**
 * R2.1. Who is already in the household this person is being put into.
 *
 * One thread down the faces, so the household reads as a household rather than
 * as a list, and each name opens that person.
 */
function HouseholdMembers({
  church,
  self,
  members,
}: {
  church: string;
  /** The person being edited, who is not news to the person editing them. */
  self?: string;
  members: HouseholdOption["members"];
}) {
  const others = members.filter((m) => m.id !== self);
  if (others.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-label text-fg-subtle">{t("personForm.householdWho")}</span>

      <ol className="relative flex flex-col gap-3 pl-6">
        <span aria-hidden className="absolute top-3 bottom-3 left-[11px] w-px bg-line" />

        {others.map((member) => (
          <li key={member.id} className="relative">
            <Link
              href={`/people/${member.id}?church=${church}`}
              className="flex items-center gap-2.5"
            >
              <Avatar
                name={member.name}
                id={member.id}
                className="absolute -left-6 size-6 border-2 border-surface text-[10px] font-semibold"
              />
              <span className="min-w-0 flex-1 truncate font-medium text-primary">
                {member.name}
              </span>
              <span className="shrink-0 text-[12px] text-fg-subtle">
                {t(`householdRole.${member.role}` as never)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

function FormCard({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5">
      <div>
        <span className="text-[15px] font-bold text-fg">{title}</span>
        {note ? <span className="block text-[13px] text-fg-subtle">{note}</span> : null}
      </div>
      {children}
    </section>
  );
}

/** R24.6. The form's Save, for a page that puts it beside the title. */
export function PersonFormActions({ editing }: { editing: boolean }) {
  return (
    <FormActions
      form="person-form"
      label={editing ? t("personForm.submitEdit") : t("personForm.submitAdd")}
    />
  );
}

export function PersonForm({
  church,
  values,
  households,
  customFields = [],
  customValues = {},
  tags = [],
  assignedTags = [],
}: {
  church: string;
  values?: PersonFormValues;
  households: HouseholdOption[];
  customFields?: FieldDef[];
  customValues?: FieldValues;
  /** R2.x. Every tag the church has, for the row on this screen. */
  tags?: { id: string; name: string }[];
  /** Which of them this person already carries. */
  assignedTags?: string[];
}) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [errors, setErrors] = React.useState<PersonErrors>({});
  const [formError, setFormError] = React.useState<string>();
  const [submitted, setSubmitted] = React.useState(false);
  const [, setPending] = React.useState(false);

  const [household, setHousehold] = React.useState(values?.householdId ?? HOUSEHOLD_NONE);
  const [status, setStatus] = React.useState(values?.lifecycleStatus ?? "visitor");
  const [chosenTags, setChosenTags] = React.useState<string[]>(assignedTags ?? []);

  const revalidate = () => {
    if (!submitted || !formRef.current) return;
    setErrors(personErrors(parsePerson(new FormData(formRef.current))));
  };

  const action = async (data: FormData) => {
    setSubmitted(true);
    setFormError(undefined);

    const found = personErrors(parsePerson(data));
    setErrors(found);
    if (hasErrors(found)) {
      const first = Object.keys(found)[0];
      const el = first ? formRef.current?.elements.namedItem(first) : null;
      if (el instanceof HTMLElement) el.focus();
      return;
    }

    setPending(true);
    try {
      // On success this redirects and never returns.
      const result = await savePerson(data);
      if (result?.errors) setErrors(result.errors);
      if (result?.formError) setFormError(result.formError);
    } finally {
      setPending(false);
    }
  };

  const editing = Boolean(values?.id);

  return (
    <form id="person-form" ref={formRef} action={action} noValidate onInput={revalidate} className="flex flex-col gap-5">
      <input type="hidden" name="church" value={church} />
      {values?.id ? <input type="hidden" name="id" value={values.id} /> : null}

      {formError ? (
        <Banner tone="danger" title={t("personForm.failed")}>{formError}</Banner>
      ) : null}

      {/* The person on the left, who they live with on the right, with a
          hairline between. A household is a different question from a phone
          number, and putting it in the same grid made it read as one. */}
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[3_1_420px] flex-col gap-5">
      <FormCard title={t("personForm.section.details")}>
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          <Field label={t("personForm.firstName")} error={errors.firstName} required>
            <Input name="firstName" defaultValue={values?.firstName ?? ""} autoComplete="off" autoFocus={!editing} />
          </Field>
          <Field label={t("personForm.lastName")} error={errors.lastName} required>
            <Input name="lastName" defaultValue={values?.lastName ?? ""} autoComplete="off" />
          </Field>
          <Field label={t("personForm.email")} error={errors.email}>
            <Input name="email" type="email" defaultValue={values?.email ?? ""} />
          </Field>
          <Field label={t("personForm.phone")} error={errors.phone}>
            <PhoneInput name="phone" defaultValue={values?.phone ?? ""} />
          </Field>
          <Field label={t("personForm.dateOfBirth")} error={errors.dateOfBirth}>
            <DateField name="dateOfBirth" defaultValue={values?.dateOfBirth ?? ""} />
          </Field>


          {/* R2.4. One line, as a church writes it on an envelope. */}
          <Field label={t("personForm.address")} className="sm:col-span-full">
            <Input
              name="address"
              defaultValue={values?.address ?? ""}
              placeholder={t("personForm.addressPlaceholder")}
              autoComplete="off"
            />
          </Field>
        </div>
      </FormCard>

      {/* Status as pills rather than a dropdown. Four values a church picks
          between every day, all visible, one press each. */}
      <FormCard title={t("personForm.status")}>
        <input type="hidden" name="lifecycleStatus" value={status} />
        <div className="flex flex-wrap gap-2">
          {lifecycleOptions().map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setStatus(o.value)}
              aria-pressed={status === o.value}
              className={cn(
                "h-[34px] rounded-full px-3.5 text-[13px] font-medium",
                status === o.value
                  ? "border-[1.5px] border-primary bg-primary-soft text-primary"
                  : "border border-line-strong bg-surface text-fg hover:bg-sunken",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </FormCard>

      {/* R2.x. Tags, as the design puts them: under the status, on the same
          card, one press each. */}
      {tags.length > 0 ? (
        <FormCard title={t("person.tags")}>
          <input type="hidden" name="tagIds" value={chosenTags.join(",")} />
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const on = chosenTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() =>
                    setChosenTags((prev) =>
                      on ? prev.filter((x) => x !== tag.id) : [...prev, tag.id],
                    )
                  }
                  aria-pressed={on}
                  className={cn(
                    "h-[34px] rounded-full px-3.5 text-[13px] font-medium",
                    on
                      ? "border-[1.5px] border-primary bg-primary-soft text-primary"
                      : "border border-line-strong bg-surface text-fg hover:bg-sunken",
                  )}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </FormCard>
      ) : null}

      {customFields.length > 0 ? (
        <FormCard title={t("person.more")}>
          <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            <CustomFieldInputs fields={customFields} values={customValues} errors={errors} />
          </div>
        </FormCard>
      ) : null}

        </div>

        <div className="flex min-w-0 flex-[2_1_280px] flex-col gap-5 md:border-l md:border-line md:pl-6">
          <FormCard title={t("personForm.household")}>
            <div className="flex flex-col gap-3.5">
              <Field label={t("personForm.householdWhich")}>
                <Select name="householdId" value={household} onValueChange={setHousehold}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {/* The two answers that are not a household sit above the
                        rule, so they are not hunted for among forty names. */}
                    <SelectItem value={HOUSEHOLD_NONE}>
                      <span className="font-semibold text-primary">
                        {t("personForm.householdNone")}
                      </span>
                    </SelectItem>
                    <SelectItem value={HOUSEHOLD_NEW}>
                      <span className="font-semibold text-primary">
                        {t("personForm.householdNew")}
                      </span>
                    </SelectItem>

                    <span aria-hidden className="my-1 block h-px bg-line" />

                    {/* R2.1. Four households called Smith are four identical
                        words, so each carries who is in it. */}
                    {households.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        <span className="flex min-w-0 items-baseline gap-1.5 overflow-hidden">
                          <span className="shrink-0">{h.name}</span>
                          {h.members.length > 0 ? (
                            <span className="min-w-0 truncate text-[13px] text-fg-muted">
                              ({h.members.map((m) => m.name.split(" ")[0]).join(", ")})
                            </span>
                          ) : null}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {household === HOUSEHOLD_NEW ? (
                <Field label={t("personForm.householdName")} error={errors.householdName} required>
                  <Input name="householdName" autoComplete="off" />
                </Field>
              ) : null}

              {household !== HOUSEHOLD_NONE ? (
                <Field label={t("personForm.householdRoleShort")}>
                  <Select name="householdRole" defaultValue={values?.householdRole ?? "other"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {householdRoleOptions().map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}

              <HouseholdMembers
                church={church}
                self={values?.id}
                members={households.find((h) => h.id === household)?.members ?? []}
              />
            </div>
          </FormCard>
        </div>
      </div>

    </form>
  );
}
