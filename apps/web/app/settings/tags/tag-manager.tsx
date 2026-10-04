"use client";

import * as React from "react";
import { Trash2, Merge, Check } from "lucide-react";
import {
  HUES,
  Button, Input, Field, Separator, Banner, HueDot,
  Dialog, DialogTrigger, DialogContent, DialogClose,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { addTag, saveTag, removeTag, foldTag } from "../../tags/actions";

export interface TagItem {
  id: string;
  name: string;
  hue: string;
  people: number;
}


/**
 * R2.x. Every tag the church uses, as the design draws them.
 *
 * Chips in their own colours rather than rows, because a tag is a thing
 * somebody recognises by its colour on a person's record, and a list of grey
 * rows is a list of words.
 */
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
    <section className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-5">
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="flex h-9 items-center gap-2 rounded-full pr-1.5 pl-3.5 text-label font-medium"
              style={{
                background: `var(--hue-${tag.hue}-tint)`,
                color: `var(--hue-${tag.hue}-key)`,
              }}
            >
              {canManage ? (
                <EditTag
                  church={church}
                  tag={tag}
                  others={tags.filter((one) => one.id !== tag.id)}
                />
              ) : (
                tag.name
              )}
              <span className="tabular-nums opacity-75">{tag.people}</span>
            </span>
          ))}
        </div>
      ) : null}

      {canCreate ? <NewTag church={church} /> : null}
    </section>
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
    <form ref={formRef} action={action} noValidate className="flex flex-col gap-1.5">
      <input type="hidden" name="church" value={church} />
      <div className="flex flex-wrap gap-2">
        <Input
          name="name"
          autoComplete="off"
          placeholder={t("tags.new")}
          aria-label={t("tags.new")}
          className="min-w-50 flex-1"
        />
        <Button type="submit" loading={pending}>{t("tags.add")}</Button>
      </div>
      {error ? <p role="alert" className="text-caption text-danger-text">{error}</p> : null}
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
        <button
          type="button"
          aria-label={t("tags.editOne", { name: tag.name })}
          className="cursor-pointer text-inherit underline-offset-4 hover:underline"
        >
          {tag.name}
        </button>
      </DialogTrigger>

      <DialogContent title={tag.name} closeLabel={t("common.close")}>
        {error ? <Banner tone="danger" title={t("tags.failed")} className="mb-4">{error}</Banner> : null}

        <form action={(d) => run(saveTag, d)} className="flex flex-col gap-4">
          <input type="hidden" name="church" value={church} />
          <input type="hidden" name="id" value={tag.id} />
          <input type="hidden" name="hue" value={hue} />

          <Field label={t("tags.name")} required>
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
