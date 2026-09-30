"use client";

import * as React from "react";
import { Mail, KeyRound } from "lucide-react";
import {
  Button, Input, Field, Tabs, TabsList, TabsTrigger, TabsContent,
  check, email as validEmail, requiredValue,
} from "@hearth/ui";
import { sendMagicLink, signInWithPassword } from "./actions";

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
        <TabsTrigger value="link">Email link</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>

      <TabsContent value="link">
        <MagicLinkForm next={next} />
      </TabsContent>

      <TabsContent value="password">
        <PasswordForm next={next} />
      </TabsContent>
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
      <Field
        label="Email"
        htmlFor="email-link"
        hint="We send a link. No password to remember."
        error={errors["email"]}
        required
      >
        <Input name="email" type="email" autoComplete="email" placeholder="you@church.org" />
      </Field>
      <Button type="submit" full loading={pending}>
        <Mail /> Send me a link
      </Button>
    </form>
  );
}

function PasswordForm({ next }: { next?: string }) {
  const validate = React.useCallback(
    (data: FormData): Errors => ({
      email: check(String(data.get("email") ?? ""), validEmail),
      password: check(String(data.get("password") ?? ""), requiredValue("your password")),
    }),
    [],
  );
  const { formRef, errors, pending, action, revalidate } = useValidatedForm(validate, signInWithPassword);

  return (
    <form ref={formRef} action={action} noValidate onInput={revalidate} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" htmlFor="email-pw" error={errors["email"]} required>
        <Input name="email" type="email" autoComplete="email" placeholder="you@church.org" />
      </Field>
      <Field label="Password" htmlFor="password" error={errors["password"]} required>
        <Input name="password" type="password" autoComplete="current-password" />
      </Field>
      <Button type="submit" full loading={pending}>
        <KeyRound /> Sign in
      </Button>
    </form>
  );
}
