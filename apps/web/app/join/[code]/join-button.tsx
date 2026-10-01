"use client";

import * as React from "react";
import { DoorOpen } from "lucide-react";
import { Button } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { join } from "./actions";

/** The join is a write, so it is a button rather than something a page load does. */
export function JoinButton({ code }: { code: string }) {
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      full
      loading={pending}
      onClick={() => startTransition(async () => { await join(code); })}
    >
      <DoorOpen /> {t("join.action")}
    </Button>
  );
}
