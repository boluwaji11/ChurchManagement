"use client";

import * as React from "react";
import { KeyRound } from "lucide-react";
import { Banner, Button, Field, Input } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { setPassword } from "../sign-up/actions";

export function ResetForm() {
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  return (
    <form
      action={(data) =>
        startTransition(async () => {
          const result = await setPassword(data);
          setError(result?.error);
        })
      }
      className="flex flex-col gap-4"
    >
      {error ? <Banner tone="danger" title={t("reset.title")}>{error}</Banner> : null}

      <Field label={t("signUp.password")} htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          autoFocus
          required
        />
      </Field>

      <Button type="submit" disabled={pending}>
        <KeyRound /> {t("reset.submit")}
      </Button>
    </form>
  );
}
