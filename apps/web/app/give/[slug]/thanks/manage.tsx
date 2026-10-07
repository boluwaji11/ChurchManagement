"use client";

import * as React from "react";
import { Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { manageGiving } from "../actions";

/**
 * R13.3. Change or stop a repeating gift, without ringing the church.
 *
 * Stripe's own billing portal, opened against the church's account. There is
 * no account on this side to sign in to, so the checkout session the giver was
 * just handed is what proves it is them.
 */
export function ManageGift({
  slug,
  session,
  quiet,
}: {
  slug: string;
  session: string;
  /** Smaller print, where an account is the louder offer beside it. */
  quiet?: boolean;
}) {
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  return (
    <>
      <Button
        variant={quiet ? "ghost" : "secondary"}
        className={quiet ? "h-auto min-h-0 p-0 text-[13px] font-medium" : undefined}
        disabled={pending}
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await manageGiving(slug, session);
            if (result.error) {
              setError(t("stripe.failed"));
              return;
            }
            if (result.url) window.location.href = result.url;
          })
        }
      >
        {quiet ? t("give.manage.quiet") : t("give.manage")}
      </Button>
      {error ? <p className="m-0 text-[13px] text-danger-text">{error}</p> : null}
    </>
  );
}
