"use client";

import * as React from "react";
import { Undo2 } from "lucide-react";
import {
  Button, Card, CardTitle, Separator, Banner, Badge,
  Dialog, DialogTrigger, DialogContent, DialogFooter, DialogClose,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import { undoImport, type RollbackOutcome } from "./actions";

export interface BatchRow {
  id: string;
  filename: string;
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
    <Card>
      <CardTitle>{t("import.history")}</CardTitle>
      <Separator className="my-4" />
      <ul className="flex flex-col">
        {batches.map((batch, i) => (
          <li key={batch.id}>
            {i > 0 ? <Separator className="my-3" /> : null}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 text-[length:var(--d-text-body)] text-fg">
                  {batch.filename}
                  {batch.status === "rolled_back" ? (
                    <Badge tone="neutral">{t("import.rolledBack")}</Badge>
                  ) : null}
                </span>
                <span className="text-caption text-fg-muted">
                  {t("import.summary", {
                    created: batch.rowsCreated,
                    updated: batch.rowsUpdated,
                    skipped: batch.rowsSkipped,
                  })}
                  {batch.committedAt ? `. ${batch.committedAt}` : ""}
                </span>
              </div>

              {canUndo && batch.canRollBack ? (
                <Undo church={church} batch={batch} />
              ) : batch.status === "committed" ? (
                <span className="text-caption text-fg-subtle">{t("import.rollback.expired")}</span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/**
 * Undoing is confirmed, and the confirmation counts.
 *
 * "Are you sure" tells nobody anything. This says how many people are about to
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
          <Button variant="ghost">
            <Undo2 /> {t("import.rollback")}
          </Button>
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
            {t("import.rollback.confirmBody", { created: batch.rowsCreated, updated: batch.rowsUpdated })}
          </p>

          <form noValidate action={submit}>
            <input type="hidden" name="church" value={church} />
            <input type="hidden" name="batchId" value={batch.id} />
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
