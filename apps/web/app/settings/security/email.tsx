"use client";

import * as React from "react";
import { Mail } from "lucide-react";
import { Banner, Button, Card, CardTitle, Field, Input, Separator } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { changeEmail } from "./actions";

/**
 * R1.8. The address somebody signs in with.
 *
 * It lives here rather than on their profile because it is not a detail the
 * church holds about them, it is how they get in, and changing it is answered
 * by email rather than taken on trust.
 */
export function ChangeEmail({ current }: { current: string }) {
  const [message, setMessage] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  return (
    <Card>
      <CardTitle>{t("email.title")}</CardTitle>
      <Separator className="my-4" />

      {error ? <Banner tone="danger" title={t("email.title")} className="mb-4">{error}</Banner> : null}
      {message ? <Banner tone="success" title={t("email.title")} className="mb-4">{message}</Banner> : null}

      <dl className="mb-4">
        <dt className="text-label text-fg-subtle">{t("email.current")}</dt>
        <dd className="text-[length:var(--d-text-body)] text-fg">{current}</dd>
      </dl>

      <form
        noValidate
        action={(data) => {
          setMessage(undefined);
          startTransition(async () => {
            const result = await changeEmail(data);
            setError(result.error);
            if (!result.error) setMessage(t("email.sent"));
          });
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="min-w-56 flex-1">
          <Field label={t("email.new")} required>
            <Input name="email" type="email" autoComplete="email" />
          </Field>
        </div>
        <Button type="submit" loading={pending}>
          <Mail /> {t("email.change")}
        </Button>
      </form>
    </Card>
  );
}
