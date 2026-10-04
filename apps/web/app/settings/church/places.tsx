"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  Banner, Button, Field, IconButton, Input,
  Dialog, DialogTrigger, DialogContent, DialogFooter,
} from "@hearth/ui";
import { t } from "@hearth/i18n";
import type { Campus, ChurchLocation } from "@hearth/db";
import { addPlace, renamePlace, dropPlace, renameSite } from "./places-actions";

/**
 * R1.2. Where this church meets.
 *
 * One campus, named, with the places inside it. No campus picker anywhere:
 * a church of 180 has one site, and a question with one answer is not a
 * question. The schema carries the shape for the day that changes.
 */
export function Places({
  church,
  campus,
  places,
  canEdit,
}: {
  church: string;
  campus: Campus | null;
  places: ChurchLocation[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [adding, setAdding] = React.useState("");
  const [editing, setEditing] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [site, setSite] = React.useState(campus?.name ?? "");
  const [pending, startTransition] = React.useTransition();

  const run = (work: () => Promise<PlaceOutcome>, after?: () => void) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) {
        after?.();
        router.refresh();
      }
    });

  return (
    <section
      className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-5"
      aria-busy={pending}
    >
      {error ? <Banner tone="danger" title={t("place.failed")}>{error}</Banner> : null}

      <div>
        <span className="font-semibold text-fg">{t("place.title")}</span>
        <span className="block text-label text-fg-subtle">{t("place.what")}</span>
      </div>

      {campus ? (
        <Field label={t("place.campus")} required>
          <Input
            value={site}
            onChange={(e) => setSite(e.target.value)}
            onBlur={() => run(() => renameSite(campus.id, site, church))}
            disabled={!canEdit}
            autoComplete="off"
          />
        </Field>
      ) : null}

      {places.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {places.map((place) => (
            <span
              key={place.id}
              className="flex h-8.5 items-center gap-1.5 rounded-full bg-sunken pr-1.5 pl-3 text-label font-medium text-fg"
            >
              {editing === place.id ? (
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() =>
                    run(() => renamePlace(place.id, draft, church), () => setEditing(null))}
                  aria-label={t("place.name")}
                  autoComplete="off"
                  autoFocus
                  size={Math.max(draft.length, 6)}
                  className="bg-transparent text-label text-fg outline-none"
                />
              ) : (
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => {
                    setEditing(place.id);
                    setDraft(place.name);
                  }}
                  className="cursor-pointer underline-offset-4 hover:underline disabled:cursor-default disabled:no-underline"
                >
                  {place.name}
                </button>
              )}

              {canEdit ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <IconButton
                      label={t("place.removeOne", { name: place.name })}
                      className="size-6 min-h-0 [&_svg]:size-3.5"
                      disabled={pending}
                    >
                      <X />
                    </IconButton>
                  </DialogTrigger>
                  <DialogContent
                    title={t("place.removeTitle", { name: place.name })}
                    closeLabel={t("common.close")}
                  >
                    <p className="text-[length:var(--d-text-body)] text-fg">
                      {t("place.removeBody")}
                    </p>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="danger"
                        disabled={pending}
                        onClick={() => run(() => dropPlace(place.id, church))}
                      >
                        {t("place.remove")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <Input
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            placeholder={t("place.addOne")}
            aria-label={t("place.name")}
            autoComplete="off"
            className="min-w-50 flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={pending || !adding.trim()}
            onClick={() => run(() => addPlace(adding, church), () => setAdding(""))}
          >
            {t("action.add")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

interface PlaceOutcome {
  error?: string;
}
