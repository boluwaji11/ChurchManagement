"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Archive, Undo2, ChevronUp, ChevronDown, Check } from "lucide-react";
import {
  Banner, Button, Dialog, DialogContent, DialogFooter, DialogTrigger,
  Field, HueDot, IconButton, Input, Textarea, ALL_HUES, type Hue,
} from "@hearth/ui";
import { t, plural } from "@hearth/i18n";
import { Empty } from "@/components/empty";
import { saveType, archiveType, reorderTypes } from "./actions";

export interface TypeRow {
  id: string;
  name: string;
  description: string | null;
  hue: string;
  archived: boolean;
  /** How many live groups are filed under it. */
  groups: number;
}

/**
 * R9.1. The kinds of group a church runs.
 *
 * A list rather than a grid, because the order matters: it is the order every
 * picker and every filter offers them in, so it is set here with the two arrows
 * rather than left to whatever the names sort to.
 */
export function TypeManager({ church, types }: { church: string; types: TypeRow[] }) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const live = types.filter((one) => !one.archived);
  const archived = types.filter((one) => one.archived);

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });

  const move = (id: string, by: -1 | 1) => {
    const order = live.map((one) => one.id);
    const at = order.indexOf(id);
    const to = at + by;
    if (at < 0 || to < 0 || to >= order.length) return;
    [order[at], order[to]] = [order[to]!, order[at]!];
    run(() => reorderTypes(order, church));
  };

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("groups.failed")}>{error}</Banner> : null}

      {live.length === 0 && archived.length === 0 ? (
        <Empty
          icon="group"
          title={t("groupType.empty.title")}
          action={<TypeDialog church={church} pending={pending} />}
        />
      ) : (
        <>
          <div className="flex justify-end">
            <TypeDialog church={church} pending={pending} />
          </div>

          <section className="overflow-hidden rounded-[14px] border border-line bg-surface">
            {live.map((one, i) => (
              <div
                key={one.id}
                className="flex min-h-[60px] flex-wrap items-center gap-3 border-b border-sunken px-5 py-2.5 last:border-b-0"
              >
                <HueDot hue={one.hue as Hue} />
                <span className="flex min-w-0 flex-[1_1_200px] flex-col leading-5">
                  <span className="truncate font-semibold text-fg">{one.name}</span>
                  {one.description ? (
                    <span className="truncate text-[13px] text-fg-muted">{one.description}</span>
                  ) : null}
                </span>

                <span className="text-[13px] text-fg-muted">
                  {plural("groupType.count", one.groups)}
                </span>

                <span className="flex items-center gap-0.5">
                  <IconButton
                    label={t("groupType.moveUp")}
                    variant="ghost"
                    disabled={pending || i === 0}
                    onClick={() => move(one.id, -1)}
                  >
                    <ChevronUp />
                  </IconButton>
                  <IconButton
                    label={t("groupType.moveDown")}
                    variant="ghost"
                    disabled={pending || i === live.length - 1}
                    onClick={() => move(one.id, 1)}
                  >
                    <ChevronDown />
                  </IconButton>

                  <TypeDialog church={church} pending={pending} type={one} />

                  <ArchiveDialog
                    name={one.name}
                    pending={pending}
                    onConfirm={() => run(() => archiveType(one.id, true, church))}
                  />
                </span>
              </div>
            ))}
          </section>
        </>
      )}

      {archived.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-label text-fg-muted">{t("groupType.archived")}</h2>
          {archived.map((one) => (
            <div key={one.id} className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[length:var(--d-text-body)] text-fg-muted">
                <HueDot hue={one.hue as Hue} />
                {one.name}
              </span>
              <IconButton
                label={t("groupType.restore")}
                variant="ghost"
                disabled={pending}
                onClick={() => run(() => archiveType(one.id, false, church))}
              >
                <Undo2 />
              </IconButton>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** R9.1. Writing a kind down, or changing one. */
function TypeDialog({
  church,
  pending,
  type,
}: {
  church: string;
  pending: boolean;
  /** Given when an existing kind is being changed. */
  type?: TypeRow;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [hue, setHue] = React.useState(type?.hue ?? "sky");
  const [saving, startTransition] = React.useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {type ? (
          <IconButton label={t("groups.edit")} variant="ghost">
            <Pencil />
          </IconButton>
        ) : (
          <Button><Plus /> {t("groupType.add")}</Button>
        )}
      </DialogTrigger>

      <DialogContent
        title={type ? t("groupType.editTitle", { name: type.name }) : t("groupType.newTitle")}
        closeLabel={t("common.close")}
      >
        <form
          noValidate
          action={(data) => {
            data.set("church", church);
            data.set("hue", hue);
            if (type) data.set("id", type.id);
            startTransition(async () => {
              const result = await saveType(data);
              setError(result.error);
              if (!result.error) {
                setOpen(false);
                router.refresh();
              }
            });
          }}
          className="flex flex-col gap-4"
        >
          {error ? <Banner tone="danger" title={t("groups.failed")}>{error}</Banner> : null}

          <Field label={t("groupType.name")} required>
            <Input name="name" defaultValue={type?.name ?? ""} autoComplete="off" autoFocus />
          </Field>

          <Field label={t("groupType.description")}>
            <Textarea name="description" rows={2} defaultValue={type?.description ?? ""} />
          </Field>

          {/* The colour its groups wear on every card, filter and date tile. */}
          <div className="flex flex-col gap-2">
            <span className="text-label text-fg">{t("groupType.colour")}</span>
            <div className="flex flex-wrap gap-1.5">
              {ALL_HUES.map((one) => (
                <button
                  key={one}
                  type="button"
                  aria-label={one}
                  aria-pressed={hue === one}
                  onClick={() => setHue(one)}
                  className={
                    "grid size-9 place-items-center rounded-full border-2 transition-colors " +
                    (hue === one ? "border-fg" : "border-transparent hover:border-line-strong")
                  }
                  style={{ background: `var(--hue-${one}-500)` }}
                >
                  {hue === one ? (
                    <Check className="size-4 text-white" strokeWidth={3} aria-hidden />
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("action.cancel")}
            </Button>
            <Button type="submit" disabled={pending || saving}>{t("action.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** R9.1. Taking a kind off the list asks first, the same as every other x. */
function ArchiveDialog({
  name,
  pending,
  onConfirm,
}: {
  name: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconButton label={t("groupType.archive")} variant="ghost">
          <Archive />
        </IconButton>
      </DialogTrigger>
      <DialogContent alert title={t("groupType.archiveTitle", { name })} closeLabel={t("common.close")}>
        <p className="text-[length:var(--d-text-body)] text-fg">{t("groupType.archiveBody")}</p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>{t("groups.keep")}</Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            {t("groupType.archive")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
