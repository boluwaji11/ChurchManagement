"use client";

import * as React from "react";
import Link from "next/link";
import {
  Button, Input, Field, Banner, cn,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { DateField } from "@/components/date-field";
import { t } from "@hearth/i18n";
import {
  parsePerson, personErrors, hasErrors,
  lifecycleOptions, householdRoleOptions, HOUSEHOLD_NEW, HOUSEHOLD_NONE,
  type PersonErrors,
} from "@/lib/person-input";
import { savePerson } from "./actions";
import { CustomFieldInputs, type FieldDef, type FieldValues } from "./custom-fields";

export interface PersonFormValues {
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
        <span className="font-semibold text-fg">{title}</span>
        {note ? <span className="block text-[13px] text-fg-subtle">{note}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function PersonForm({
  church,
  values,
  households,
  customFields = [],
  customValues = {},
}: {
  church: string;
  values?: PersonFormValues;
  households: { id: string; name: string }[];
  customFields?: FieldDef[];
  customValues?: FieldValues;
}) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [errors, setErrors] = React.useState<PersonErrors>({});
  const [formError, setFormError] = React.useState<string>();
  const [submitted, setSubmitted] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const [household, setHousehold] = React.useState(values?.householdId ?? HOUSEHOLD_NONE);
  const [status, setStatus] = React.useState(values?.lifecycleStatus ?? "visitor");

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
    <form ref={formRef} action={action} noValidate onInput={revalidate} className="flex flex-col gap-5">
      <input type="hidden" name="church" value={church} />
      {values?.id ? <input type="hidden" name="id" value={values.id} /> : null}

      {formError ? (
        <Banner tone="danger" title={t("personForm.failed")}>{formError}</Banner>
      ) : null}

      {/* Details. One grid that wraps at 220px, so it is two up on a desk and
          one up on a phone without a breakpoint per field. */}
      <FormCard title={t("personForm.section.details")}>
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          <Field label={t("personForm.firstName")} error={errors.firstName} required>
            <Input name="firstName" defaultValue={values?.firstName ?? ""} autoComplete="off" autoFocus={!editing} />
          </Field>
          <Field label={t("personForm.lastName")} error={errors.lastName} required>
            <Input name="lastName" defaultValue={values?.lastName ?? ""} autoComplete="off" />
          </Field>
          <Field label={t("personForm.preferredName")}>
            <Input name="preferredName" defaultValue={values?.preferredName ?? ""} autoComplete="off" />
          </Field>
          <Field label={t("personForm.email")} error={errors.email}>
            <Input name="email" type="email" defaultValue={values?.email ?? ""} />
          </Field>
          <Field label={t("personForm.phone")} error={errors.phone}>
            <Input name="phone" type="tel" defaultValue={values?.phone ?? ""} />
          </Field>
          <Field label={t("personForm.dateOfBirth")} error={errors.dateOfBirth}>
            <DateField name="dateOfBirth" defaultValue={values?.dateOfBirth ?? ""} />
          </Field>
          <Field label={t("personForm.firstVisit")} error={errors.firstVisitOn}>
            <DateField name="firstVisitOn" defaultValue={values?.firstVisitOn ?? ""} />
          </Field>
          <Field label={t("personForm.membershipDate")} error={errors.membershipDate}>
            <DateField name="membershipDate" defaultValue={values?.membershipDate ?? ""} />
          </Field>

          <Field label={t("personForm.household")}>
            <Select name="householdId" value={household} onValueChange={setHousehold}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={HOUSEHOLD_NONE}>{t("personForm.householdNone")}</SelectItem>
                <SelectItem value={HOUSEHOLD_NEW}>{t("personForm.householdNew")}</SelectItem>
                {households.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
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
            <Field label={t("personForm.householdRole")}>
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

          {/* R8.10. Two fields a volunteer reads at a check-in desk, so they
              live on the record rather than in a note somebody has to open. */}
          <Field label={t("personForm.allergies")} error={errors.allergies}>
            <Input name="allergies" defaultValue={values?.allergies ?? ""} autoComplete="off" />
          </Field>
          <Field label={t("personForm.medicalNote")} error={errors.medicalNote}>
            <Input name="medicalNote" defaultValue={values?.medicalNote ?? ""} autoComplete="off" />
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
                  ? "border border-fg bg-fg text-canvas"
                  : "border border-line-strong bg-surface text-fg hover:bg-sunken",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </FormCard>

      {customFields.length > 0 ? (
        <FormCard title={t("person.more")} note={t("personForm.customNote")}>
          <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            <CustomFieldInputs fields={customFields} values={customValues} errors={errors} />
          </div>
        </FormCard>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button asChild variant="secondary">
          <Link href={values?.id ? `/people/${values.id}?church=${church}` : `/people?church=${church}`}>
            {t("action.cancel")}
          </Link>
        </Button>
        <Button type="submit" loading={pending}>
          {editing ? t("personForm.submitEdit") : t("personForm.submitAdd")}
        </Button>
      </div>
    </form>
  );
}
