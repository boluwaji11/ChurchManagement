"use client";

import * as React from "react";
import { Mail, KeyRound } from "lucide-react";
import { Button, Input, Field, Tabs, TabsList, TabsTrigger, TabsContent } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { check, email as validEmail, requiredValue } from "@/lib/validate";
import Link from "next/link";
import { sendMagicLink, signInWithPassword } from "./actions";
import { sendReset } from "../sign-up/actions";

type Errors = Record<string, string | undefined>;

/**
 * Validation is ours, not the browser's.
 *
 * `noValidate` turns off native validation, because its bubble is unstyled,
 * unlocalised, vanishes on its own, and looks like a different product. Messages
 * render through Field instead, which wires aria-invalid and aria-describedby,
 * and the first invalid control takes focus so a keyboard or screen reader user
 * lands on the problem rather than hunting for it.
 *
 * Errors appear on submit, then follow along as the field is corrected. Nagging
 * someone mid-typing before they have finished is not helpful.
 */
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

function useValidatedForm(validate: (data: FormData) => Errors, submit: (data: FormData) => Promise<void>) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [errors, setErrors] = React.useState<Errors>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const revalidate = React.useCallback(() => {
    if (!submitted || !formRef.current) return;
    setErrors(validate(new FormData(formRef.current)));
  }, [submitted, validate]);

  const action = async (data: FormData) => {
    setSubmitted(true);
    const found = validate(data);
    setErrors(found);

    const firstInvalid = Object.keys(found).find((k) => found[k]);
    if (firstInvalid) {
      const el = formRef.current?.elements.namedItem(firstInvalid);
      if (el instanceof HTMLElement) el.focus();
      return;
    }

    setPending(true);
    try {
      await submit(data);
    } finally {
      setPending(false);
    }
  };

  return { formRef, errors, pending, action, revalidate };
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
