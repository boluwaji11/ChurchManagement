"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banner } from "@hearth/ui";
import { t } from "@hearth/i18n";
import { putAway } from "./actions";

/**
 * R22.1. The line a church sees until it has finished setting up.
 *
 * Above the page title, because it is about the church rather than about the
 * screen. Closing it is the same as putting the wizard away: it comes back from
 * Settings while there is still something to do.
 */
export function SetupBanner({ church }: { church: string }) {
  const router = useRouter();
  const [gone, setGone] = React.useState(false);
  const [, startTransition] = React.useTransition();

  if (gone) return null;

  return (
    <Banner
      tone="info"
      title={t("setup.title")}
      className="mb-6"
      closeLabel={t("common.close")}
      onClose={() => {
        setGone(true);
        startTransition(async () => {
          await putAway(church);
          router.refresh();
        });
      }}
    >
      <Link href={`/setup?church=${church}`} className="underline underline-offset-4">
        {t("setup.finish")}
      </Link>
    </Banner>
  );
}
