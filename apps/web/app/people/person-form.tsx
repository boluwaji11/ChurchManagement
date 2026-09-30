"use client";

import * as React from "react";
import Link from "next/link";
import { Save, X } from "lucide-react";
import {
  Button, Input, Field, Card, CardTitle, Separator, Banner,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import {
  parsePerson, personErrors, hasErrors,
  LIFECYCLE_OPTIONS, HOUSEHOLD_ROLE_OPTIONS, HOUSEHOLD_NEW, HOUSEHOLD_NONE,
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
    <form ref={formRef} action={action} noValidate onInput={revalidate} className="flex flex-col gap-6">
      <input type="hidden" name="church" value={church} />
      {values?.id ? <input type="hidden" name="id" value={values.id} /> : null}

      {formError ? (
        <Banner tone="danger" title="Not saved">{formError}</Banner>
      ) : null}

      <Card>
        <CardTitle>Name</CardTitle>
        <Separator className="my-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" error={errors.firstName} required>
            <Input name="firstName" defaultValue={values?.firstName ?? ""} autoComplete="off" autoFocus={!editing} />
          </Field>
          <Field label="Surname" error={errors.lastName} required>
            <Input name="lastName" defaultValue={values?.lastName ?? ""} autoComplete="off" />
          </Field>
          <Field label="Goes by" className="sm:col-span-2">
            <Input name="preferredName" defaultValue={values?.preferredName ?? ""} autoComplete="off" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle>Contact</CardTitle>
        <Separator className="my-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" error={errors.email}>
            <Input name="email" type="email" defaultValue={values?.email ?? ""} placeholder="name@example.org" />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <Input name="phone" type="tel" defaultValue={values?.phone ?? ""} placeholder="(512) 555 0148" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle>Household</CardTitle>
        <Separator className="my-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Household">
            <Select name="householdId" value={household} onValueChange={setHousehold}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={HOUSEHOLD_NONE}>Not in a household</SelectItem>
                <SelectItem value={HOUSEHOLD_NEW}>Start a new household</SelectItem>
                {households.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {household === HOUSEHOLD_NEW ? (
            <Field label="Household name" error={errors.householdName} required>
              <Input name="householdName" placeholder="The Bennett family" autoComplete="off" />
            </Field>
          ) : null}

          {household !== HOUSEHOLD_NONE ? (
            <Field label="Role in the household">
              <Select name="householdRole" defaultValue={values?.householdRole ?? "other"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOUSEHOLD_ROLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardTitle>Status and dates</CardTitle>
        <Separator className="my-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <Select name="lifecycleStatus" defaultValue={values?.lifecycleStatus ?? "visitor"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIFECYCLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date of birth" error={errors.dateOfBirth}>
            <Input name="dateOfBirth" type="date" defaultValue={values?.dateOfBirth ?? ""} />
          </Field>
          <Field label="First visit" error={errors.firstVisitOn}>
            <Input name="firstVisitOn" type="date" defaultValue={values?.firstVisitOn ?? ""} />
          </Field>
          <Field label="Became a member" error={errors.membershipDate}>
            <Input name="membershipDate" type="date" defaultValue={values?.membershipDate ?? ""} />
          </Field>
        </div>
      </Card>

      {customFields.length > 0 ? (
        <Card>
          <CardTitle>More</CardTitle>
          <Separator className="my-4" />
          <CustomFieldInputs fields={customFields} values={customValues} errors={errors} />
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending}>
          <Save /> {editing ? "Save changes" : "Add person"}
        </Button>
        <Button asChild variant="ghost">
          <Link href={values?.id ? `/people/${values.id}?church=${church}` : `/people?church=${church}`}>
            <X /> Cancel
          </Link>
        </Button>
      </div>
    </form>
  );
}
