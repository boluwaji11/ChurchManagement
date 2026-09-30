"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Trash2 } from "lucide-react";
import {
  Banner, Button, Dialog, DialogTrigger, DialogContent, DialogClose,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { loadDemo, removeDemo } from "../settings/actions";

/**
 * R19.7. A church to look around before committing to an import.
 *
 * Shown on the directory rather than in settings, because the empty directory
 * is the moment somebody needs it. Time to value is the metric this serves: the
 * work of finding out whether the product suits them is the import they have
 * not decided to do yet.
 *
 * Once it is loaded it says so, on the list it filled, with the way out beside
 * the saying. A demo somebody cannot tell apart from their own records is a
 * demo that ends up in a giving statement.
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
        <Banner tone="info" title={plural("demo.loaded", people)}>
          {canEdit ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" className="mt-1">
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
          ) : null}
        </Banner>
      ) : canEdit ? (
        <Button
          variant="secondary"
          className="self-start"
          disabled={pending}
          onClick={() => act(loadDemo)}
        >
          <Sparkles /> {t("demo.load")}
        </Button>
      ) : null}
    </div>
  );
}
