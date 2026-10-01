"use client";

import * as React from "react";
import { KeyRound, Mail } from "lucide-react";
import { Banner, Button, Card, CardTitle, Field, Input, Separator } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { changePassword, emailMeALink } from "./actions";

/**
 * R1.8. Changing a password, and getting one for the first time.
 *
 * Changing it needs the current one. Somebody who has only ever signed in by
 * email link does not have one to give, so they ask for a link instead: a
 * password that can be set from an open session is a password an open session
 * can take.
 */
export function Password() {
  const [message, setMessage] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  return (
    <Card>
      <CardTitle>{t("password.title")}</CardTitle>
      <Separator className="my-4" />

      {error ? <Banner tone="danger" title={t("password.title")} className="mb-4">{error}</Banner> : null}
      {message ? <Banner tone="success" title={message} className="mb-4" /> : null}

      <form
        action={(data) =>
          startTransition(async () => {
            const result = await changePassword(data);
            setError(result.error);
            setMessage(result.error ? undefined : t("password.changed"));
          })
        }
        className="flex flex-col gap-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("password.current")} htmlFor="current" required>
            <Input id="current" name="current" type="password" autoComplete="current-password" required />
          </Field>

          <Field label={t("password.new")} htmlFor="next" required>
            <Input
              id="next"
              name="next"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            <KeyRound /> {t("password.change")}
          </Button>

          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await emailMeALink();
                setError(result.error);
                setMessage(result.error ? undefined : t("signUp.sent.title"));
              })
            }
          >
            <Mail /> {t("password.sendLink")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
