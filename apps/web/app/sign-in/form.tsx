"use client";

import * as React from "react";
import { Mail, KeyRound } from "lucide-react";
import { Button, Input, Field, Tabs, TabsList, TabsTrigger, TabsContent } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { check, email as validEmail, requiredValue } from "@/lib/validate";
import { useValidatedForm, type Errors } from "@/lib/use-validated-form";
import Link from "next/link";
import { sendMagicLink, signInWithPassword } from "./actions";
import { sendReset } from "../sign-up/actions";

export function SignInForm({ next }: { next?: string }) {
  return (
    <Tabs defaultValue="link">
      <TabsList>
        <TabsTrigger value="link">{t("signIn.tab.link")}</TabsTrigger>
        <TabsTrigger value="password">{t("signIn.tab.password")}</TabsTrigger>
      </TabsList>

      <TabsContent value="link">
        <MagicLinkForm next={next} />
      </TabsContent>

      <TabsContent value="password">
        <PasswordForm next={next} />
      </TabsContent>

      <Link
        href="/sign-up?next=/create-church"
        className="mt-4 inline-block text-[length:var(--d-text-body)] text-fg-muted underline-offset-4 hover:text-fg hover:underline"
      >
        {t("signIn.noAccount")}
      </Link>
    </Tabs>
  );
}

function MagicLinkForm({ next }: { next?: string }) {
  const validate = React.useCallback(
    (data: FormData): Errors => ({ email: check(String(data.get("email") ?? ""), validEmail) }),
    [],
  );
  const { formRef, errors, pending, action, revalidate } = useValidatedForm(validate, sendMagicLink);

  return (
    <form ref={formRef} action={action} noValidate onInput={revalidate} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label={t("signIn.email")} htmlFor="email-link" error={errors["email"]} required>
        <Input name="email" type="email" autoComplete="email" placeholder={t("signIn.emailPlaceholder")} />
      </Field>
      <Button type="submit" full loading={pending}>
        <Mail /> {t("signIn.sendLink")}
      </Button>
    </form>
  );
}

function PasswordForm({ next }: { next?: string }) {
  const validate = React.useCallback(
    (data: FormData): Errors => ({
      email: check(String(data.get("email") ?? ""), validEmail),
      password: check(String(data.get("password") ?? ""), requiredValue(t("validate.password"))),
    }),
    [],
  );
  const { formRef, errors, pending, action, revalidate } = useValidatedForm(validate, signInWithPassword);

  return (
    <form ref={formRef} action={action} noValidate onInput={revalidate} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label={t("signIn.email")} htmlFor="email-pw" error={errors["email"]} required>
        <Input name="email" type="email" autoComplete="email" placeholder={t("signIn.emailPlaceholder")} />
      </Field>
      <Field label={t("signIn.password")} htmlFor="password" error={errors["password"]} required>
        <Input name="password" type="password" autoComplete="current-password" />
      </Field>
      <Button type="submit" full loading={pending}>
        <KeyRound /> {t("signIn.submit")}
      </Button>

      {/* R1.8. The way back in for somebody who cannot remember, and the way
          in for somebody who has never set one. */}
      <button
        type="submit"
        formAction={sendReset}
        className="text-[length:var(--d-text-body)] text-fg-muted underline-offset-4 hover:text-fg hover:underline"
      >
        {t("signIn.forgot")}
      </button>
    </form>
  );
}
