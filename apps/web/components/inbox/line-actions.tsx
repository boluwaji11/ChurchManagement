"use client";

import * as React from "react";
import { Pencil, Reply, Trash2 } from "lucide-react";
import { Button, Dialog, DialogContent, DialogFooter } from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { deleteLine } from "@/app/messages/actions";
import { ReactButton } from "./marks";
import type { Mark } from "./data";

/**
 * R16.9, R2.13. What somebody may do with a line.
 *
 * Answer it, and where they wrote it, change it or take it back. Marks rather
 * than a menu behind a menu: three things, each of which is one press, and a
 * row of them reads at a glance where a row of dots reads as "something is
 * hidden here".
 *
 * They appear on hover with a pointer and stay put where there is none.
 */
export function LineActions({
  church,
  id,
  mine,
  marks,
  onReply,
  onEdit,
  onChanged,
}: {
  church: string;
  id: string;
  /** Whether the reader wrote it: only then may it be changed or taken back. */
  mine: boolean;
  /** What is already against it, so the picker shows what is held down. */
  marks: Mark[];
  onReply: () => void;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [asking, setAsking] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const mark = "grid size-6 shrink-0 cursor-pointer place-items-center rounded-full"
    + " text-fg-subtle opacity-0 transition-opacity hover:bg-sunken hover:text-fg"
    + " focus-visible:opacity-100 group-hover:opacity-100"
    + " [@media(hover:none)]:opacity-100 [&_svg]:size-[14px]";

  return (
    <>
      {/* R16.9. A mark against somebody's line sits with answering it: the
          two are the same errand. Nobody marks their own. */}
      {mine ? null : (
        <ReactButton
          church={church}
          id={id}
          marks={marks}
          onChanged={onChanged}
          className={mark}
        />
      )}

      <button type="button" aria-label={t("inbox.reply")} title={t("inbox.reply")}
        onClick={onReply} className={mark}
      >
        <Reply aria-hidden />
      </button>

      {mine ? (
        <>
          <button type="button" aria-label={t("inbox.edit")} title={t("inbox.edit")}
            onClick={onEdit} className={mark}
          >
            <Pencil aria-hidden />
          </button>
          <button type="button" aria-label={t("inbox.delete")} title={t("inbox.delete")}
            onClick={() => setAsking(true)} className={mark}
          >
            <Trash2 aria-hidden />
          </button>
        </>
      ) : null}

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
