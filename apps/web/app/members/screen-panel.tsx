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
  closeTo = "/members",
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  /** Where closing lands. */
  closeTo?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  /*
   * R24.6. The window's own state, so the close square closes it at once.
   *
   * These screens are a parallel slot, and a soft navigation keeps a slot's
   * last content: default.tsx answers a fresh load, nothing else. So moving
   * the address alone left the window standing. Stepping back instead closed
   * it only where nobody had moved around inside it first, which is why a
   * reader who opened the archived shelf had to press close twice.
   */
  const [open, setOpen] = React.useState(true);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        setOpen(false);
        router.replace(closeTo);
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
