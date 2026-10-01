"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
import { Banner, Button, Field, Input } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { goToCode } from "./actions";

/**
 * R1.7. The other way in, for somebody who was given a code rather than a link.
 *
 * It only navigates. Everything that decides what happens is behind the link.
 */
export function JoinWithCode() {
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
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-sm"
    >
      {error ? <Banner tone="danger" title={error} /> : null}
      <Field label={t("join.codeLabel")}>
        <Input name="code" autoComplete="off" spellCheck={false} />
      </Field>
      <Button type="submit" variant="secondary" loading={pending} full>
        {t("join.codeAction")} <ArrowRight />
      </Button>
    </form>
  );
}
