"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { told } from "./actions";

/** R8.13. One press, and the moment it happened is kept with the report. */
export function Notify({ church, id }: { church: string; id: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await told(id, church);
            setError(result.error);
            if (!result.error) router.refresh();
          })
        }
      >
        {t("incident.markNotified")}
      </Button>
      {error ? <span className="text-caption text-danger">{error}</span> : null}
    </div>
  );
}
