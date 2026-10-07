"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dialog, DialogContent } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { giftSession } from "@/app/give/[slug]/actions";

/**
 * R13.6, R17.4. What a member reads when Stripe sends them back.
 *
 * The same words a stranger gets on the thank-you page, said here instead,
 * because somebody who gave from their own screens never left them. What
 * happened is read from Stripe rather than from the address, so the line
 * about a bank transfer only appears when there is one.
 */
export function GiftThanks({ slug, church }: { slug: string; church: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("gift");

  const [said, setSaid] = React.useState<{ pending: boolean; repeating: boolean }>();

  React.useEffect(() => {
    if (!id) return;
    let live = true;
    void giftSession(slug, id).then((gift) => {
      if (live) setSaid({ pending: gift.pending, repeating: gift.repeating });
    });
    return () => {
      live = false;
    };
  }, [id, slug]);

  const close = () => {
    setSaid(undefined);
    router.replace(`/giving?church=${slug}`);
    router.refresh();
  };

  return (
    <Dialog open={Boolean(said)} onOpenChange={(on) => (on ? null : close())}>
      <DialogContent title={t("give.thanks.title")} closeLabel={t("common.close")}>
        <div className="flex flex-col gap-2">
          <p className="m-0 text-[length:var(--d-text-body)] text-fg-muted">
            {said?.pending
              ? t("give.thanks.bank", { church })
              : t("give.thanks.body", { church })}
          </p>
          {said?.repeating ? (
            <p className="m-0 text-[length:var(--d-text-body)] text-fg-muted">
              {t("give.thanks.repeat")}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
