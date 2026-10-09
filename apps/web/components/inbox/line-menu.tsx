"use client";

import * as React from "react";
import { EllipsisVertical, Pencil, Trash2 } from "lucide-react";
import {
  Button, Dialog, DialogContent, DialogFooter,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { deleteLine } from "@/app/messages/actions";

/**
 * R16.9, R2.13. What somebody may do to a line they wrote.
 *
 * Everybody sends the wrong thing eventually, and a product whose only answer
 * is a second message saying "sorry, I meant Tuesday" is a product people
 * apologise to.
 *
 * Deleting is confirmed, like every destructive action here, and takes the
 * words rather than the line: the conversation still reads in order and says
 * something was taken back.
 */
export function LineMenu({
  church,
  id,
  onEdit,
  onChanged,
}: {
  church: string;
  id: string;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [asking, setAsking] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("inbox.more")}
            className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-full text-fg-subtle opacity-0 transition-opacity hover:bg-sunken hover:text-fg focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 [&_svg]:size-[15px]"
          >
            <EllipsisVertical aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil /> {t("inbox.edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setAsking(true)}>
            <Trash2 /> {t("inbox.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={asking} onOpenChange={(next) => { if (!busy) setAsking(next); }}>
        <DialogContent title={t("inbox.deleteAsk")}>
          <DialogFooter>
            <Button variant="secondary" disabled={busy} onClick={() => setAsking(false)}>
              {t("action.cancel")}
            </Button>
            <Button
              loading={busy}
              onClick={() => {
                setBusy(true);
                void deleteLine(id, church).then(() => {
                  setBusy(false);
                  setAsking(false);
                  onChanged();
                });
              }}
            >
              {t("inbox.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
