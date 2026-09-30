"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, Merge, Check } from "lucide-react";
import {
  Button, Input, Field, Card, Separator, Banner, HueTag, HueDot,
  Dialog, DialogTrigger, DialogContent, DialogClose,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  type Hue,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { addTag, saveTag, removeTag, foldTag } from "./actions";

export interface TagItem {
  id: string;
  name: string;
  hue: string;
  people: number;
}

const HUES: Hue[] = ["rose", "amber", "citron", "fern", "teal", "sky", "indigo", "violet"];

export function TagManager({
  church,
  tags,
  canManage,
  canCreate,
}: {
  church: string;
  tags: TagItem[];
  canManage: boolean;
  canCreate: boolean;
}) {
  return (
    <div className="flex flex-col gap-8">
      {canCreate ? <NewTag church={church} /> : null}

      {tags.length === 0 ? null : (
        <Card>
          <ul className="flex flex-col">
            {tags.map((tag, i) => (
              <li key={tag.id}>
                {i > 0 ? <Separator className="my-3" /> : null}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <HueTag hue={tag.hue as Hue}>{tag.name}</HueTag>
                    <span className="text-caption text-fg-muted">
                      {plural("tags.peopleCount", tag.people)}
                    </span>
                  </div>
                  {canManage ? <EditTag church={church} tag={tag} others={tags.filter((t) => t.id !== tag.id)} /> : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function NewTag({ church }: { church: string }) {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [error, setError] = React.useState<string>();
  const [pending, setPending] = React.useState(false);

  const action = async (data: FormData) => {
    setError(undefined);
    setPending(true);
    try {
      const result = await addTag(data);
      if (result.error) setError(result.error);
      else formRef.current?.reset();
    } finally {
      setPending(false);
    }
  };

  return (
    <form ref={formRef} action={action} noValidate className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="church" value={church} />
      <Field label={t("tags.new")} error={error} className="min-w-64 flex-1">
        <Input name="name" autoComplete="off" placeholder={t("tags.newPlaceholder")} />
      </Field>
      <Button type="submit" loading={pending}>
        <Plus /> {t("action.add")}
      </Button>
    </form>
  );
}

/**
 * One dialog holds everything a tag can have done to it.
 *
 * Rename, recolour, merge and delete in one place, because four separate
 * controls on every row turns a list of twenty tags into a wall of buttons.
 * Delete confirms inline rather than opening a second dialog: a dialog that
 * opens a dialog means the flow is wrong.
 */
function EditTag({ church, tag, others }: { church: string; tag: TagItem; others: TagItem[] }) {
  const [open, setOpen] = React.useState(false);
  const [hue, setHue] = React.useState(tag.hue);
  const [error, setError] = React.useState<string>();
  const [pending, setPending] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);
  const [mergeInto, setMergeInto] = React.useState<string>();

  const run = async (fn: (d: FormData) => Promise<{ error?: string }>, data: FormData) => {
    setError(undefined);
    setPending(true);
    try {
      const result = await fn(data);
      if (result.error) setError(result.error);
      else setOpen(false);
    } finally {
      setPending(false);
    }
  };

  const reset = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setError(undefined);
      setConfirmingDelete(false);
      setMergeInto(undefined);
      setHue(tag.hue);
    }
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button variant="ghost">
          <Pencil /> {t("action.edit")}
        </Button>
      </DialogTrigger>

      <DialogContent title={tag.name} closeLabel={t("common.close")}>
        {error ? <Banner tone="danger" title={t("tags.failed")} className="mb-4">{error}</Banner> : null}

        <form action={(d) => run(saveTag, d)} className="flex flex-col gap-4">
          <input type="hidden" name="church" value={church} />
          <input type="hidden" name="id" value={tag.id} />
          <input type="hidden" name="hue" value={hue} />

          <Field label={t("tags.name")}>
            <Input name="name" defaultValue={tag.name} autoComplete="off" />
          </Field>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-label text-fg">{t("tags.colour")}</legend>
            <div className="flex flex-wrap gap-1.5">
              {HUES.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHue(h)}
                  aria-pressed={hue === h}
                  aria-label={h}
                  className="inline-flex size-8 items-center justify-center rounded-full border border-line-strong aria-[pressed=true]:border-fg"
                  style={{ background: `var(--hue-${h}-tint)` }}
                >
                  {hue === h ? (
                    <Check className="size-4" style={{ color: `var(--hue-${h}-key)` }} />
                  ) : (
                    <HueDot hue={h} />
                  )}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center gap-3">
            <Button type="submit" loading={pending}>{t("action.save")}</Button>
            <DialogClose asChild>
              <Button type="button" variant="ghost">{t("action.cancel")}</Button>
            </DialogClose>
          </div>
        </form>

        {others.length > 0 ? (
          <>
            <Separator className="my-5" />
            <form action={(d) => run(foldTag, d)} className="flex flex-col gap-3">
              <input type="hidden" name="church" value={church} />
              <input type="hidden" name="fromId" value={tag.id} />
              <Field label={t("tags.mergeInto")}>
                <Select name="intoId" value={mergeInto} onValueChange={setMergeInto}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("tags.mergeChoose")} />
                  </SelectTrigger>
                  <SelectContent>
                    {others.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Button type="submit" variant="secondary" disabled={!mergeInto} loading={pending}>
                <Merge /> {t("tags.mergeAction", { name: tag.name })}
              </Button>
            </form>
          </>
        ) : null}

        <Separator className="my-5" />

        {confirmingDelete ? (
          <form action={(d) => run(removeTag, d)} className="flex flex-col gap-3">
            <input type="hidden" name="church" value={church} />
            <input type="hidden" name="id" value={tag.id} />
            <p className="text-[length:var(--d-text-body)] text-fg">
              {plural("tags.deleteBody", tag.people)}
            </p>
            <div className="flex items-center gap-3">
              <Button type="submit" variant="danger" loading={pending}>
                <Trash2 /> {t("tags.deleteAction", { name: tag.name })}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setConfirmingDelete(false)}>
                {t("tags.keep")}
              </Button>
            </div>
          </form>
        ) : (
          <Button type="button" variant="ghost" onClick={() => setConfirmingDelete(true)}>
            <Trash2 /> {t("action.delete")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
