"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Button, Sheet, SheetContent, Dialog, DialogContent, DialogFooter,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { useDirty } from "@/components/form-actions";
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
  cancelTo,
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
  /**
   * R24.6. Where a form's own Cancel lands, beside its Save.
   *
   * The close square leaves the record altogether; an edit form also needs the
   * way back to the record it is editing, which is a different errand and a
   * different address.
   */
  cancelTo?: string;
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

  /** Where a confirmed leave is going, which Cancel and the close square set. */
  const going = React.useRef(closeTo);

  const leave = (to = closeTo) => {
    leaving.current = true;
    setOpen(false);
    router.replace(to);
  };

  /*
   * R24.6. Cancel stays on the record it was editing.
   *
   * It moves the address and leaves the window standing: the record is drawn
   * in the same window the form was. Closing it first dropped the reader onto
   * the list for as long as the record took to arrive, which is a screen they
   * never asked for.
   */
  const backToRecord = () => {
    router.push(cancelTo!);
  };

  const cancel = () => {
    if (!cancelTo) return;
    if (dirty) {
      going.current = cancelTo;
      setConfirmClose(true);
      return;
    }
    backToRecord();
  };


  const panelFooter = cancelTo ? (
    <div className="flex w-full flex-wrap items-center justify-end gap-2">
      <Button variant="secondary" onClick={cancel}>{t("action.cancel")}</Button>
      {footer}
    </div>
  ) : footer;

  return (
    <>
    {/* R24.6. Asked in the middle, as everything this product asks is. It used
        to take the window's own footer over, which left the question in the
        same place as the press that had just been refused. */}
    <Dialog open={confirmClose} onOpenChange={(next) => { if (!next) setConfirmClose(false); }}>
      <DialogContent title={t("unsaved.title")}>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setConfirmClose(false)}>
            {t("unsaved.stay")}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmClose(false);
              if (cancelTo && going.current === cancelTo) backToRecord();
              else leave(going.current);
            }}
          >
            {t("unsaved.discard")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        going.current = closeTo;
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
    </>
  );
}
