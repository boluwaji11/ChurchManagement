"use client";

import * as React from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Button, Field, Input } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { check, email as validEmail, minLength } from "@/lib/validate";
import { useValidatedForm, type Errors } from "@/lib/use-validated-form";
import { signUp } from "./actions";

export const PASSWORD_LENGTH = 10;

/** R22.1. The first screen of the first hour. */
export function SignUpForm({ next }: { next?: string }) {
  const validate = React.useCallback(
    (data: FormData): Errors => ({
      email: check(String(data.get("email") ?? ""), validEmail),
      password: check(
        String(data.get("password") ?? ""),
        minLength(PASSWORD_LENGTH, t("signUp.password").toLowerCase()),
      ),
    }),
    [],
  );
  const { formRef, errors, pending, action, revalidate } = useValidatedForm(validate, signUp);

  return (
    <form
      ref={formRef}
      action={action}
      noValidate
      onInput={revalidate}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="next" value={next ?? ""} />

      <Field label={t("signUp.name")} htmlFor="fullName">
        <Input id="fullName" name="fullName" autoComplete="name" autoFocus />
      </Field>

      <Field label={t("signIn.email")} htmlFor="email" error={errors["email"]} required>
        <Input id="email" name="email" type="email" autoComplete="email" />
      </Field>

      <Field label={t("signUp.password")} htmlFor="password" error={errors["password"]} required>
        <Input id="password" name="password" type="password" autoComplete="new-password" />
      </Field>

      <Button type="submit" full loading={pending}>
        <UserPlus /> {t("signUp.submit")}
      </Button>

      <Link
        href="/sign-in"
        className="text-[length:var(--d-text-body)] text-fg-muted underline-offset-4 hover:text-fg hover:underline"
      >
        {t("signUp.haveAccount")}
      </Link>
    </form>
  );
}
