"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Banner, Button, Card, CardTitle, EmptyState, Field, IconButton, Input, Separator,
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
    <Card aria-busy={pending}>
      <CardTitle>{t("place.title")}</CardTitle>
      <Separator className="my-4" />

      <div className="flex flex-col gap-4">
        {error ? <Banner tone="danger" title={t("place.failed")}>{error}</Banner> : null}

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

        <Separator />
        <span className="text-label text-fg">{t("place.locations")}</span>

        {places.length === 0 ? (
          <EmptyState title={t("place.empty")} />
        ) : (
          <ul className="flex flex-col">
            {places.map((place, i) => (
              <li key={place.id}>
                {i > 0 ? <Separator className="my-2" /> : null}
                <div className="flex flex-wrap items-center gap-2">
                  {editing === place.id ? (
                    <>
                      <Input
                        className="min-w-0 flex-1"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        aria-label={t("place.name")}
                        autoComplete="off"
                        autoFocus
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () => renamePlace(place.id, draft, church),
                            () => setEditing(null),
                          )}
                      >
                        {t("action.save")}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                        {t("action.cancel")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate text-[length:var(--d-text-body)] text-fg">
                        {place.name}
                      </span>

                      {canEdit ? (
                        <>
                          <IconButton
                            label={t("action.edit")}
                            disabled={pending}
                            onClick={() => {
                              setEditing(place.id);
                              setDraft(place.name);
                            }}
                          >
                            <Pencil />
                          </IconButton>

                          <Dialog>
                            <DialogTrigger asChild>
                              <IconButton label={t("place.remove")} disabled={pending}>
                                <Trash2 />
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
                        </>
                      ) : null}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {canEdit ? (
          <div className="flex flex-wrap items-end gap-3">
            <Field label={t("place.name")} className="min-w-48 flex-1">
              <Input
                value={adding}
                onChange={(e) => setAdding(e.target.value)}
                autoComplete="off"
              />
            </Field>
            <Button
              type="button"
              variant="secondary"
              disabled={pending || !adding.trim()}
              onClick={() => run(() => addPlace(adding, church), () => setAdding(""))}
            >
              <Plus /> {t("place.add")}
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

interface PlaceOutcome {
  error?: string;
}
