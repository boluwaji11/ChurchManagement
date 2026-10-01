"use client";

import * as React from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Button, Field, Input } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { signUp } from "./actions";

/** R22.1. The first screen of the first hour. */
export function SignUpForm({ next }: { next?: string }) {
  const [pending, startTransition] = React.useTransition();

  return (
    <form
      action={(data) => {
        if (next) data.set("next", next);
        startTransition(() => signUp(data));
      }}
      className="flex flex-col gap-4"
    >
      <Field label={t("signUp.name")} htmlFor="fullName">
        <Input id="fullName" name="fullName" autoComplete="name" autoFocus />
      </Field>

      <Field label={t("signIn.email")} htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>

      <Field label={t("signUp.password")} htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </Field>

      <Button type="submit" disabled={pending}>
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
