"use client";

import * as React from "react";
import { Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { startDemo } from "./actions";

/**
 * Building a church takes a few seconds, so the press says so while it works.
 * A button that looks unpressed for four seconds gets pressed four times.
 */
export function StartDemoButton() {
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={() => startTransition(async () => { await startDemo(); })}
    >
      {pending ? t("demo.starting") : t("demo.start")}
    </Button>
  );
}
