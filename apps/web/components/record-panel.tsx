"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button, Sheet, SheetContent } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { useDirty } from "@/components/form-actions";
import { OPEN_INBOX } from "@/components/inbox/write-to";
import { RecordBody } from "@/components/record-body";

export interface RecordPanelSection {
  id: string;
  label: string;
}

export function RecordPanel({
  title,
  sections,
  aside,
  showing,
  actions,
  footer,
  formId,
  width,
  closeTo,
  children,
}: {
  title: string;
  /** The rail. A record with one part to read has none. */
  sections?: RecordPanelSection[];
  /** Parts the window can show that the rail does not name. */
  aside?: string[];
  /** The section the server drew, where the rail navigates rather than hides. */
  showing?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  formId?: string;
  /** The window's width, where a record needs more room than the usual one. */
  width?: string;
  /** Where closing lands, which is the list the record was opened from. */
  closeTo: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  /*
   * R24.6. The window's own state, so the close square closes it at once. The
   * record is a parallel slot, and a soft navigation keeps a slot's last
   * content, so moving the address alone leaves the window standing.
   */
  const path = usePathname();
  const [open, setOpen] = React.useState(true);

  /*
   * R24.6. Open again whenever the address changes.
   *
   * The window lives in a parallel slot, and Next keeps that slot's component
   * alive across a soft navigation. Closing one set `open` to false, and
   * opening the next record reused the same instance with that false still in
   * it: the address changed, nothing appeared, and a second press on the row
   * was what finally drew it.
   */
  const leaving = React.useRef(false);
  React.useEffect(() => {
    /* Leaving changes the address too, so without this the effect would answer
       the close by opening the window straight back up. */
    if (leaving.current) {
      leaving.current = false;
      return;
    }
    setOpen(true);
  }, [path]);

  const [confirmClose, setConfirmClose] = React.useState(false);
  const dirty = useDirty(formId ?? "");

  const leave = () => {
    leaving.current = true;
    setOpen(false);
    router.replace(closeTo);
  };


  /*
   * R16.9, R24.6. A press that opens the message thread steps the window
   * aside first.
   *
   * The thread is drawn in the corner of the page, under this window and
   * behind its overlay, where nothing of it can be seen or pressed. The
   * record is one press away on the list, and the errand somebody started was
   * the message.
   */
  React.useEffect(() => {
    const stepAside = () => leave();
    window.addEventListener(OPEN_INBOX, stepAside);
    return () => window.removeEventListener(OPEN_INBOX, stepAside);
  });

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
        width={width ?? "880px"}
        className="gap-0"
        bodyClassName={
          sections ? "min-h-0 gap-0 overflow-hidden p-0" : "min-h-0 gap-6 overflow-y-auto"
        }
      >
        {sections ? (
          <RecordBody sections={sections} aside={aside} showing={showing} className="flex-1">
            {children}
          </RecordBody>
        ) : (
          children
        )}
      </SheetContent>
    </Sheet>
  );
}
