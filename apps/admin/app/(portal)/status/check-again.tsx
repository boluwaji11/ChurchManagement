"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@connectapp/ui";

/**
 * HRT-394, R24.6. Ask every service again, now.
 *
 * The screen draws what is on record while it is less than a minute old,
 * because the rail links here from everywhere and a prefetch must not fire
 * seven calls to other people's APIs. This press says to go and look anyway,
 * and it says so through the address rather than through state, so the
 * answer it produces can be sent to somebody.
 *
 * It says it is working while it works: a press that looks like nothing
 * happened is a press somebody makes again.
 */
export function CheckAgain() {
  const router = useRouter();
  const [checking, start] = React.useTransition();

  return (
    <Button
      variant="secondary"
      disabled={checking}
      onClick={() => start(() => router.push(`/status?now=${Date.now()}`))}
    >
      <RefreshCw className={checking ? "motion-safe:animate-spin" : undefined} />
      {checking ? "Checking" : "Check again"}
    </Button>
  );
}
