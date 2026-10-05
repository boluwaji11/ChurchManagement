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
        minLength(PASSWORD_LENGTH, t("signUp.password").toLowerCase()),
      ),
    }),
    [],
  );

  const { formRef, errors, pending, action, revalidate } = useValidatedForm(
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
      className="flex flex-col gap-4"
    >
      {failed ? <Banner tone="danger" title={t("reset.title")}>{failed}</Banner> : null}

      <Field label={t("signUp.password")} htmlFor="password" error={errors["password"]} required>
        <Input id="password" name="password" type="password" autoComplete="new-password" autoFocus />
      </Field>

      <Button type="submit" full loading={pending}>
        <KeyRound /> {t("reset.submit")}
      </Button>
    </form>
  );
}
