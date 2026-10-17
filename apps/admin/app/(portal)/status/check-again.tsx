"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@connectapp/ui";

/**
 * HRT-394, R24.6. Run the probes again.
 *
 * The screen probes on every render, so this is a refresh. It says so while
 * it is working, because a press that looks like nothing happened is a press
 * somebody makes again, and this one costs seven calls to other people's
 * APIs.
 */
export function CheckAgain() {
  const router = useRouter();
  const [checking, start] = React.useTransition();

  return (
    <Button
      variant="secondary"
      disabled={checking}
      onClick={() => start(() => router.refresh())}
    >
      <RefreshCw className={checking ? "animate-spin" : undefined} />
      {checking ? "Checking" : "Check again"}
    </Button>
  );
}
