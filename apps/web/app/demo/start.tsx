"use client";

import * as React from "react";
import { Play } from "lucide-react";
import { Button, cn } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { startDemo } from "./actions";

/**
 * Building a church takes a few seconds, so the press says so while it works.
 * A button that looks unpressed for four seconds gets pressed four times.
 */
export function StartDemoButton({
  className,
  children,
}: {
  className?: string;
  /** Given, this is what the press looks like: a screen rather than a label. */
  children?: React.ReactNode;
}) {
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      aria-label={children ? t("site.shot.office") : undefined}
      className={cn(className)}
      disabled={pending}
      onClick={() => startTransition(async () => { await startDemo(); })}
    >
      {children ?? (
        pending ? (
          t("demo.starting")
        ) : (
          <>
            <Play className="size-4" aria-hidden />
            {t("demo.start")}
          </>
        )
      )}
    </Button>
  );
}
