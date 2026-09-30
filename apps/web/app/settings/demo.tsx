"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trash2 } from "lucide-react";
import {
  Banner, Button, Dialog, DialogTrigger, DialogContent, DialogClose,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { loadDemo, removeDemo } from "./actions";

/**
 * R19.7. A church to look around before committing to an import.
 *
 * Time to value is the metric this serves. An empty directory tells a church
 * nothing about whether the product suits them, and the work of finding out is
 * the import they have not decided to do yet.
 */
export function DemoData({
  church,
  loaded,
  people,
  canEdit,
}: {
  church: string;
  loaded: boolean;
  people: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const act = (fn: (d: FormData) => Promise<{ error?: string }>) => {
    const data = new FormData();
    data.set("church", church);
    startTransition(async () => {
      const result = await fn(data);
      setError(result.error);
      if (!result.error) router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("demo.title")}>{error}</Banner> : null}

      {loaded ? (
        <p className="text-[length:var(--d-text-body)] text-fg-muted">
          {plural("demo.loaded", people)}
        </p>
      ) : null}

      {canEdit ? (
        loaded ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" className="self-start">
                <Trash2 /> {t("demo.remove")}
              </Button>
            </DialogTrigger>
            <DialogContent title={t("demo.removeTitle")} closeLabel={t("common.close")}>
              <p className="mb-5 text-[length:var(--d-text-body)] text-fg-muted">
                {t("demo.removeBody", { count: String(people) })}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <DialogClose asChild>
                  <Button variant="danger" onClick={() => act(removeDemo)}>
                    <Trash2 /> {t("demo.remove")}
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="ghost">{t("action.cancel")}</Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <Button
            variant="secondary"
            className="self-start"
            disabled={pending}
            onClick={() => act(loadDemo)}
          >
            <Sparkles /> {t("demo.load")}
          </Button>
        )
      ) : null}
    </div>
  );
}
