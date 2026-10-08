"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R24.9. What the reader gets when something broke.
 *
 * Never the fault itself: a stack trace tells a volunteer nothing and tells
 * anybody reading over their shoulder too much. It says what happened, offers
 * the one thing worth trying, and the digest is there for whoever is asked
 * about it afterwards.
 */
export default function Fault({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[screen] it did not render", error);
  }, [error]);

  return (
    <main className="site-wash grid min-h-dvh place-items-center px-6 py-10">
      <div className="flex max-w-[420px] flex-col items-center gap-4 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger-text [&_svg]:size-5">
          <TriangleAlert aria-hidden />
        </span>

        <span className="flex flex-col gap-1.5">
          <span className="font-display text-[22px] leading-7 text-fg">{t("fault.title")}</span>
          <span className="text-[length:var(--d-text-body)] text-fg-muted">{t("fault.body")}</span>
        </span>

        <Button onClick={reset}>{t("fault.retry")}</Button>

        {error.digest ? (
          <span className="font-mono text-[12px] text-fg-subtle">
            {t("fault.ref", { ref: error.digest })}
          </span>
        ) : null}
      </div>
    </main>
  );
}
