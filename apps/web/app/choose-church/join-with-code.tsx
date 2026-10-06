"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
import { Banner, Button, Field, Input } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { goToCode } from "./actions";
import { AUTH_INPUT, AUTH_BUTTON } from "../auth-shell";

/**
 * R1.7. The other way in, for somebody who was given a code rather than a link.
 *
 * It only navigates. Everything that decides what happens is behind the link.
 */
export function JoinWithCode({ secondary }: { secondary?: boolean }) {
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  return (
    <form
      noValidate
      action={(data) =>
        startTransition(async () => {
          const result = await goToCode(data);
          setError(result?.error);
        })
      }
      className="flex flex-col gap-4"
    >
      {error ? <Banner tone="danger" title={error} /> : null}
      <Field label={t("join.codeLabel")} required>
        <Input name="code" autoComplete="off" spellCheck={false} className={AUTH_INPUT} />
      </Field>
      <Button type="submit" variant={secondary ? "secondary" : "primary"} loading={pending} full className={AUTH_BUTTON}>
        {t("join.codeAction")} <ArrowRight />
      </Button>
    </form>
  );
}
