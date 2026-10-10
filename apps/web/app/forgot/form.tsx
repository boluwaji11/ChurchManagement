"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Button, Input, Field } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { check, email as validEmail } from "@/lib/validate";
import { sendReset } from "../sign-up/actions";
import { AUTH_INPUT, AUTH_BUTTON } from "../auth-chrome";

/**
 * R1.8. The one box a reset needs.
 *
 * The button stays dark until the address is one, because a form that cannot
 * be sent should say so by the button rather than by answering a press with a
 * complaint. The server still refuses a blank, since the server is the guard,
 * but nobody should have to meet that refusal to find out.
 */
export function ForgotForm() {
  const [address, setAddress] = React.useState("");
  const ready = !check(address, validEmail);

  return (
    <form action={sendReset} noValidate className="flex flex-col gap-5">
      <Field label={t("signIn.email")} required>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder={t("signIn.emailPlaceholder")}
          className={AUTH_INPUT}
        />
      </Field>

      <Send ready={ready} />
    </form>
  );
}

function Send({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" full loading={pending} disabled={!ready || pending} className={AUTH_BUTTON}>
      {t("forgot.send")}
    </Button>
  );
}
