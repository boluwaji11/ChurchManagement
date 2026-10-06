"use client";

import * as React from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Button, Field, Input } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { check, email as validEmail, minLength, requiredValue } from "@/lib/validate";
import { useValidatedForm, type Errors } from "@/lib/use-validated-form";
import { signUp } from "./actions";
import { AUTH_INPUT, AUTH_BUTTON } from "../auth-shell";

export const PASSWORD_LENGTH = 10;

/** R22.1. The first screen of the first hour. */
export function SignUpForm({ next }: { next?: string }) {
  const validate = React.useCallback(
    (data: FormData): Errors => ({
      email: check(String(data.get("email") ?? ""), validEmail),
      firstName: check(String(data.get("firstName") ?? ""), requiredValue(t("signUp.firstName").toLowerCase())),
      lastName: check(String(data.get("lastName") ?? ""), requiredValue(t("signUp.lastName").toLowerCase())),
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
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="next" value={next ?? ""} />

      {/* Two boxes rather than one. These are not a label on an account: they
          are the first and last name of the founder's own record in the church,
          and guessing where a name splits gets some of them wrong. */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("signUp.firstName")} htmlFor="firstName" error={errors["firstName"]} required>
          <Input id="firstName" name="firstName" autoComplete="given-name" autoFocus className={AUTH_INPUT} />
        </Field>
        <Field label={t("signUp.lastName")} htmlFor="lastName" error={errors["lastName"]} required>
          <Input id="lastName" name="lastName" autoComplete="family-name" className={AUTH_INPUT} />
        </Field>
      </div>

      <Field label={t("signIn.email")} htmlFor="email" error={errors["email"]} required>
        <Input id="email" name="email" type="email" autoComplete="email" className={AUTH_INPUT} />
      </Field>

      <Field label={t("signUp.password")} htmlFor="password" error={errors["password"]} required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className={AUTH_INPUT}
        />
      </Field>

      <Button type="submit" full loading={pending} className={AUTH_BUTTON}>
        <UserPlus /> {t("signUp.submit")}
      </Button>

      <span className="border-t border-line pt-4 text-center text-[length:var(--d-text-body)] text-fg-muted">
        {t("signUp.haveAccountAsk")}{" "}
        <Link href="/sign-in" className="font-medium text-primary">
          {t("signIn.title")}
        </Link>
      </span>
    </form>
  );
}
