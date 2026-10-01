"use client";

import * as React from "react";
import {useRouter } from "next/navigation";
import {
  Banner, Button } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { ask } from "../actions";

/** R9.5. Asking, from the group's own page. */
export function JoinButton({ church, groupId }: { church: string; groupId: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  return (
    <span className="flex flex-wrap items-center gap-3">
      {error ? <Banner tone="danger" title={t("find.failed")}>{error}</Banner> : null}
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await ask(groupId, null, church);
            setError(result.error);
            if (!result.error) router.refresh();
          })
        }
      >
        {t("find.join")}
      </Button>
    </span>
  );
}
