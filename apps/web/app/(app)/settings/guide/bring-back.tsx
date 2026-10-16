"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banner, Button } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { showGuide } from "@/components/guide/guide-actions";

/** R22.1. The one press that puts the guide back beside every screen. */
export function BringBack({ away }: { away: boolean }) {
  const router = useRouter();
  const [working, start] = React.useTransition();

  if (!away) return <Banner tone="info">{t("setup.bringBack.showing")}</Banner>;

  return (
    <Button
      className="self-start"
      loading={working}
      disabled={working}
      onClick={() =>
        start(async () => {
          await showGuide(true);
          router.refresh();
        })
      }
    >
      {t("setup.bringBack")}
    </Button>
  );
}
