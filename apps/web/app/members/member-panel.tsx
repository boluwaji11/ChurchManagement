"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Sheet, SheetContent } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { useDirty } from "@/components/form-actions";
import { RecordBody } from "./record-body";

export interface MemberPanelSection {
  id: string;
  label: string;
}

export function MemberPanel({
  title,
  sections,
  actions,
  footer,
  formId,
  closeTo = "/members",
  children,
}: {
  title: string;
  sections: MemberPanelSection[];
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  formId?: string;
  /** Where closing lands, which is the list the record was opened from. */
  closeTo?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  /*
   * R24.6. The window's own state, so the close square closes it at once. The
   * record is a parallel slot, and a soft navigation keeps a slot's last
   * content, so moving the address alone leaves the window standing.
   */
  const [open, setOpen] = React.useState(true);
  const [confirmClose, setConfirmClose] = React.useState(false);
  const dirty = useDirty(formId ?? "");

  const leave = () => {
    setOpen(false);
    router.replace(closeTo);
  };

  const panelFooter = confirmClose ? (
    <div role="alert" className="flex w-full flex-wrap items-center justify-between gap-3">
      <span className="text-[13px] font-medium text-fg">{t("unsaved.title")}</span>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => setConfirmClose(false)}>
          {t("unsaved.stay")}
        </Button>
        <Button variant="danger" onClick={() => leave()}>
          {t("unsaved.discard")}
        </Button>
      </div>
    </div>
  ) : footer;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        if (dirty) setConfirmClose(true);
        else leave();
      }}
    >
      <SheetContent
        title={title}
        closeLabel={t("common.close")}
        actions={actions}
        footer={panelFooter}
        layout="centered"
        width="880px"
        className="gap-0"
        bodyClassName="min-h-0 gap-0 overflow-hidden p-0"
      >
        <RecordBody sections={sections} className="flex-1">{children}</RecordBody>
      </SheetContent>
    </Sheet>
  );
}
