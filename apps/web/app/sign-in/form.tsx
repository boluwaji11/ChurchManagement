"use client";

import * as React from "react";
import { Mail, KeyRound } from "lucide-react";
import { Button, Input, Field } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { check, email as validEmail, requiredValue } from "@/lib/validate";
import { useValidatedForm, type Errors } from "@/lib/use-validated-form";
import Link from "next/link";
import { sendMagicLink, signInWithPassword } from "./actions";
import { sendReset } from "../sign-up/actions";
import { AUTH_INPUT, AUTH_BUTTON } from "../auth-shell";

/**
 * R17.1. Signing in, with a password or with a link.
 *
 * The password leads, because it is what somebody who signs in every week
 * uses. The link is underneath for everybody else, and it is the only way in
 * for a member who never set a password: one press and the email arrives.
 */
export function SignInForm({ next, email }: { next?: string; email?: string }) {
  const [byLink, setByLink] = React.useState(false);

  return (
    <div className="flex flex-col gap-5">
      {byLink ? (
        <MagicLinkForm next={next} email={email} />
      ) : (
        <PasswordForm next={next} email={email} />
      )}

      <div className="flex flex-col gap-2 border-t border-line pt-4 text-center text-[length:var(--d-text-body)]">
        <button
          type="button"
          onClick={() => setByLink((was) => !was)}
          className="cursor-pointer font-medium text-primary"
        >
          {byLink ? t("signIn.tab.password") : t("signIn.tab.link")}
        </button>

        <span className="text-fg-muted">
          {t("signIn.noAccountAsk")}{" "}
          <Link
            href={`/sign-up${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-medium text-primary"
          >
            {t("signIn.noAccount")}
          </Link>
        </span>
      </div>
    </div>
  );
}

function MagicLinkForm({ next, email }: { next?: string; email?: string }) {
  const validate = React.useCallback(
    (data: FormData): Errors => ({ email: check(String(data.get("email") ?? ""), validEmail) }),
    [],
  );
  const { formRef, errors, pending, action, revalidate } = useValidatedForm(validate, sendMagicLink);

  return (
    <form ref={formRef} action={action} noValidate onInput={revalidate} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label={t("signIn.email")} htmlFor="email-link" error={errors["email"]} required>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={email}
          placeholder={t("signIn.emailPlaceholder")}
          className={AUTH_INPUT}
        />
      </Field>
      <Button type="submit" full loading={pending} className={AUTH_BUTTON}>
        <Mail /> {t("signIn.sendLink")}
      </Button>
    </form>
  );
}

function PasswordForm({ next, email }: { next?: string; email?: string }) {
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
        <Input
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={email}
          placeholder={t("signIn.emailPlaceholder")}
          className={AUTH_INPUT}
        />
      </Field>
      <Field label={t("signIn.password")} htmlFor="password" error={errors["password"]} required>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          className={AUTH_INPUT}
        />
      </Field>
      <Button type="submit" full loading={pending} className={AUTH_BUTTON}>
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
