"use client";

import * as React from "react";
import { KeyRound } from "lucide-react";
import { Banner, Button, Field, Input } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { check, minLength } from "@/lib/validate";
import { useValidatedForm, type Errors } from "@/lib/use-validated-form";
import { setPassword } from "../sign-up/actions";
import { PASSWORD_LENGTH } from "../sign-up/form";

export function ResetForm() {
  const [failed, setFailed] = React.useState<string>();

  const validate = React.useCallback(
    (data: FormData): Errors => ({
      password: check(
        String(data.get("password") ?? ""),
        /* Not lowered: this message opens with the field's name, so it is
           the first word of the sentence. "Enter {what}" below is not. */
        minLength(PASSWORD_LENGTH, t("signUp.password")),
      ),
    }),
    [],
  );

  const { formRef, errors, pending, ready, action, revalidate, touch, field } = useValidatedForm(
    validate,
    async (data) => {
      const result = await setPassword(data);
      setFailed(result?.error);
    },
  );

  return (
    <form
      ref={formRef}
      action={action}
      noValidate
      onInput={revalidate}
      onBlur={touch}
      className="flex flex-col gap-4"
    >
      {failed ? <Banner tone="danger">{failed}</Banner> : null}

      <Field label={t("signUp.password")} htmlFor="password" error={errors["password"]} required>
        <Input id="password" {...field("password")} type="password" autoComplete="new-password" autoFocus />
      </Field>

      <Button type="submit" full disabled={!ready} loading={pending}>
        <KeyRound /> {t("reset.submit")}
      </Button>
    </form>
  );
}
