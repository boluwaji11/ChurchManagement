"use client";

import * as React from "react";
import { Undo2 } from "lucide-react";
import {
  Button, IconButton, Banner, Badge,
  Dialog, DialogTrigger, DialogContent, DialogFooter, DialogClose,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { undoImport, type RollbackOutcome } from "./actions";

export interface BatchRow {
  id: string;
  filename: string;
  /** R19.5. "members" or "groups", which decides how it is undone and described. */
  kind: string;
  status: string;
  rowsCreated: number;
  rowsUpdated: number;
  rowsSkipped: number;
  committedAt: string | null;
  canRollBack: boolean;
}

export function ImportHistory({
  church,
  batches,
  canUndo,
}: {
  church: string;
  batches: BatchRow[];
  canUndo: boolean;
}) {
  if (batches.length === 0) return null;

  return (
    <section className="flex flex-col rounded-lg border border-line bg-surface">
      <h2 className="px-5 pt-4.5 pb-3.5 text-[15px] font-semibold text-fg">
        {t("import.history")}
      </h2>

      <ul className="flex flex-col">
        {batches.map((batch) => (
          <li
            key={batch.id}
            className="flex items-start gap-2 border-t border-line px-5 py-3.5"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-fg">
                <span className="truncate">{batch.filename}</span>
                {batch.status === "rolled_back" ? (
                  <Badge tone="neutral">{t("import.rolledBack")}</Badge>
                ) : null}
              </span>
              <span className="text-[12px] text-fg-muted">
                {batch.kind === "groups"
                  ? t("import.group.summary", {
                      joined: batch.rowsCreated,
                      created: batch.rowsUpdated,
                      skipped: batch.rowsSkipped,
                    })
                  : t("import.summary", {
                      created: batch.rowsCreated,
                      updated: batch.rowsUpdated,
                      skipped: batch.rowsSkipped,
                    })}
              </span>
              {batch.committedAt ? (
                <span className="text-[12px] text-fg-subtle">{batch.committedAt}</span>
              ) : null}
            </div>

            {canUndo && batch.canRollBack ? (
              <Undo church={church} batch={batch} />
            ) : batch.status === "committed" ? (
              <span className="text-[12px] text-fg-subtle">{t("import.rollback.expired")}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Undoing is confirmed, and the confirmation counts.
 *
 * "Are you sure" tells nobody anything. This says how many members are about to
 * be removed, how many put back, and what happens to anyone who has been worked
 * on since, which is the part nobody would guess.
 */
function Undo({ church, batch }: { church: string; batch: BatchRow }) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [outcome, setOutcome] = React.useState<RollbackOutcome>();

  const submit = async (data: FormData) => {
    setPending(true);
    try {
      const result = await undoImport(data);
      setOutcome(result);
      if (!result.error) setOpen(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <IconButton
            label={t("import.rollback")}
            variant="ghost"
          >
            <Undo2 />
          </IconButton>
        </DialogTrigger>
        <DialogContent
          alert
          title={t("import.rollback.confirmTitle", { filename: batch.filename })}
          description={t("import.rollback.window")}
        >
          {outcome?.error ? (
            <Banner tone="danger" title={t("import.failed")} className="mb-4">{outcome.error}</Banner>
          ) : null}

          <p className="mb-5 text-[length:var(--d-text-body)] text-fg">
            {batch.kind === "groups"
              ? t("import.group.rollbackBody", {
                  joined: batch.rowsCreated,
                  created: batch.rowsUpdated,
                })
              : t("import.rollback.confirmBody", {
                  created: batch.rowsCreated,
                  updated: batch.rowsUpdated,
                })}
          </p>

          <form noValidate action={submit}>
            <input type="hidden" name="church" value={church} />
            <input type="hidden" name="batchId" value={batch.id} />
            <input type="hidden" name="kind" value={batch.kind} />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost" data-dismiss>
                  {t("import.rollback.keep")}
                </Button>
              </DialogClose>
              <Button type="submit" variant="danger" loading={pending}>
                <Undo2 /> {t("import.rollback")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {outcome && !outcome.error ? (
        <Banner tone="success" title={t("import.rolledBack")}>
          {t("import.rollback.done", {
            removed: outcome.removed ?? 0,
            restored: outcome.restored ?? 0,
            archived: outcome.archived ?? 0,
          })}
        </Banner>
      ) : null}
    </>
  );
}
