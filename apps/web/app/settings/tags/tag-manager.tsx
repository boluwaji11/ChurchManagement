"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Trash2, Merge, Check, Plus } from "lucide-react";
import {
  HUES,
  Button, IconButton, Input, Field, Separator, Banner, HueDot,
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
      <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex"
              style={{
                background: `var(--hue-${tag.hue}-tint)`,
                color: `var(--hue-${tag.hue}-key)`,
                borderRadius: 999,
              }}
            >
              {canManage ? (
                <EditTag
                  church={church}
                  tag={tag}
                  others={tags.filter((one) => one.id !== tag.id)}
                />
              ) : (
                <span className={CHIP}>{tag.name}</span>
              )}
            </span>
          ))}

        {canCreate ? <NewTag church={church} /> : null}
      </div>
    </section>
  );
}

/** The pill itself: the whole shape is the control, with its name centred. */
const CHIP = "flex h-9 items-center justify-center rounded-full px-3.5 text-label font-medium";

/**
 * R1.10. A new tag, asked for in a box rather than in a field on the page.
 *
 * The row of pills is what this screen is. A permanently open input under it
 * was a form sitting there asking to be filled in on a screen somebody opened
 * to read.
 */
function NewTag({ church }: { church: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [pending, setPending] = React.useState(false);

  const save = async () => {
    setError(undefined);
    setPending(true);
    try {
      const data = new FormData();
      data.set("church", church);
      data.set("name", name);
      const result = await addTag(data);
      if (result.error) {
        setError(result.error);
        return;
      }
      setName("");
      setOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`${CHIP} cursor-pointer gap-1.5 border border-dashed border-line-strong text-fg-muted hover:bg-sunken hover:text-fg`}
        >
          <Plus className="size-4" aria-hidden /> {t("tags.add")}
        </button>
      </DialogTrigger>

      <DialogContent title={t("tags.add")} closeLabel={t("common.close")}>
        {error ? <Banner tone="danger" title={t("tags.failed")}>{error}</Banner> : null}

        <Field label={t("tags.name")} required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            autoFocus
          />
        </Field>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            {t("action.cancel")}
          </Button>
          <Button type="button" disabled={pending || !name.trim()} onClick={() => void save()}>
            {t("action.add")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
          className={`${CHIP} cursor-pointer text-inherit hover:brightness-95`}
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
          <div className="flex justify-end">
            <IconButton
              label={t("tags.deleteOne", { name: tag.name })}
              variant="ghost"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 />
            </IconButton>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
