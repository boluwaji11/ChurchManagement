"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent } from "@connectapp/ui";
import { t } from "@connectapp/i18n";

/**
 * R24.6. A member screen that is not a sectioned record, over the directory.
 *
 * MemberPanel carries a section rail and a dirty-form guard because a record
 * is written in it. These screens read, so the panel is the window alone.
 */
export function ScreenPanel({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
    >
      <SheetContent
        title={title}
        closeLabel={t("common.close")}
        actions={actions}
        layout="centered"
        width="880px"
      >
        {children}
      </SheetContent>
    </Sheet>
  );
}
