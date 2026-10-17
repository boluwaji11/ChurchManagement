"use client";

import * as React from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Banner, Button, Field, Input } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { check, email as validEmail, minLength, requiredValue } from "@/lib/validate";
import { useValidatedForm, type Errors } from "@/lib/use-validated-form";
import { PASSWORD_LENGTH } from "@/lib/password";
import { signUp } from "./actions";
import { AUTH_INPUT, AUTH_BUTTON } from "../auth-chrome";

export { PASSWORD_LENGTH } from "@/lib/password";

/** R22.1. The first screen of the first hour. */
export function SignUpForm({ next, email }: { next?: string; email?: string }) {
  const validate = React.useCallback(
    (data: FormData): Errors => ({
      email: check(String(data.get("email") ?? ""), validEmail),
      firstName: check(String(data.get("firstName") ?? ""), requiredValue(t("signUp.firstName").toLowerCase())),
      lastName: check(String(data.get("lastName") ?? ""), requiredValue(t("signUp.lastName").toLowerCase())),
      password: check(
        String(data.get("password") ?? ""),
        /* Not lowered: this message opens with the field's name, so it is
           the first word of the sentence. "Enter {what}" below is not. */
        minLength(PASSWORD_LENGTH, t("signUp.password")),
      ),
    }),
    [],
  );
  const { formRef, errors, failed, pending, ready, action, revalidate, touch, field } =
    useValidatedForm(validate, signUp, { email: email ?? "" });

  return (
    <form
      ref={formRef}
      action={action}
      noValidate
      onInput={revalidate}
      onBlur={touch}
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="next" value={next ?? ""} />

      {/* R1.7. What the server refused, above the boxes it refused, with every
          box still holding what was typed into it. */}
      {failed ? <Banner tone="danger">{failed}</Banner> : null}

      {/* Two boxes rather than one. These are not a label on an account: they
          are the first and last name of the founder's own record in the church,
          and guessing where a name splits gets some of them wrong. */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("signUp.firstName")} htmlFor="firstName" error={errors["firstName"]} required>
          <Input id="firstName" {...field("firstName")} autoComplete="given-name" autoFocus className={AUTH_INPUT} />
        </Field>
        <Field label={t("signUp.lastName")} htmlFor="lastName" error={errors["lastName"]} required>
          <Input id="lastName" {...field("lastName")} autoComplete="family-name" className={AUTH_INPUT} />
        </Field>
      </div>

      <Field label={t("signIn.email")} htmlFor="email" error={errors["email"]} required>
        <Input
          id="email"
          {...field("email")}
          type="email"
          autoComplete="email"
          className={AUTH_INPUT}
        />
      </Field>

      <Field label={t("signUp.password")} htmlFor="password" error={errors["password"]} required>
        <Input
          id="password"
          {...field("password")}
          type="password"
          autoComplete="new-password"
          className={AUTH_INPUT}
        />
      </Field>

      <Button type="submit" full disabled={!ready} loading={pending} className={AUTH_BUTTON}>
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
