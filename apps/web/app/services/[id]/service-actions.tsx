"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarX, Undo2 } from "lucide-react";
import {
  Banner, Button,
  Dialog, DialogTrigger, DialogContent, DialogFooter, DialogClose,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { setCancelled } from "../actions";

/**
 * R7.8. Calling a service off, and putting it back.
 *
 * A cancelled service stays on the calendar marked cancelled, so a gap in the
 * attendance record is explained rather than blank, and nobody is counted
 * absent from a service that did not happen.
 */
export function ServiceActions({
  church,
  id,
  name,
  date,
  cancelled,
}: {
  church: string;
  id: string;
  name: string;
  date: string;
  cancelled: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const run = (next: boolean) => {
    const data = new FormData();
    data.set("church", church);
    data.set("id", id);
    data.set("cancelled", next ? "1" : "0");
    startTransition(async () => {
      const result = await setCancelled(data);
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  if (cancelled) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {error ? <Banner tone="danger" title={t("services.failed")}>{error}</Banner> : null}
        <Button variant="secondary" disabled={pending} onClick={() => run(false)}>
          <Undo2 /> {t("services.restore")}
        </Button>
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <CalendarX /> {t("services.cancel")}
        </Button>
      </DialogTrigger>
      <DialogContent alert title={t("services.cancelTitle", { name, date })}>
        {error ? (
          <Banner tone="danger" title={t("services.failed")} className="mb-4">{error}</Banner>
        ) : null}
        <p className="mb-5 text-[length:var(--d-text-body)] text-fg-muted">
          {t("services.cancelBody")}
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" data-dismiss>{t("services.keep")}</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="danger" onClick={() => run(true)}>
              <CalendarX /> {t("services.cancel")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
