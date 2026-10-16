"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Working } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { showGuide } from "@/components/guide/guide-actions";

/**
 * R22.1. The guide comes back, and the church lands on the church.
 *
 * Done on arrival rather than behind a press, because pressing Setup guide in
 * the settings list is the press. Done here rather than in a route, because a
 * link in that list is prefetched on hover and a church should not turn the
 * guide back on by moving the mouse over it.
 */
export function BringBack() {
  const router = useRouter();

  React.useEffect(() => {
    let live = true;
    void showGuide(true).then(() => {
      if (!live) return;
      router.replace("/settings/church");
      router.refresh();
    });
    return () => {
      live = false;
    };
  }, [router]);

  return <Working open label={t("settings.tab.guide")} />;
}
