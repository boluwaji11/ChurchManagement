"use client";

import * as React from "react";
import { Archive } from "lucide-react";
import {
  Button, Dialog, DialogTrigger, DialogContent, DialogFooter,
} from "@hearth/ui";
import { t } from "@hearth/i18n";

export interface GroupTypeOption {
  id: string;
  name: string;
  hue: string;
}

/** The fields the form writes, which is every field a group has. */
export interface GroupDraft {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  typeId: string | null;
  dayOfWeek: number | null;
  startsAt: string | null;
  endsAt: string | null;
  frequency: string | null;
  endsOn: string | null;
  location: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  capacity: number | null;
  forWhom: string | null;
  online: boolean;
  childrenWelcome: boolean;
  openToJoin: boolean;
  listed: boolean;
}

export function ArchiveDialog({
  name,
  pending,
  onConfirm,
  trigger,
}: {
  name: string;
  pending: boolean;
  onConfirm: () => void;
  /** What opens it, where the screen wants something other than a button. */
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="ghost"><Archive /> {t("groups.archive")}</Button>}
      </DialogTrigger>
      <DialogContent alert title={t("groups.archiveTitle", { name })}>
        <div className="flex flex-col gap-4">
          <p className="text-[length:var(--d-text-body)] text-fg">{t("groups.archiveBody")}</p>
          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => setOpen(false)}>
              {t("groups.keep")}
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              <Archive /> {t("groups.archiveAction", { name })}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
