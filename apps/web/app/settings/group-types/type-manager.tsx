"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, Plus, Undo2 } from "lucide-react";
import {
  Banner, Button, Field, IconButton, Input, LIFT,
  Sheet, SheetContent, SheetTrigger,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Empty } from "@/components/empty";
import { RichText } from "@/components/rich-text";
import { usePanelGuard } from "@/components/panel-guard";
import { saveType, archiveType } from "./actions";
import { useFormError } from "@/lib/form-error";

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
 * A tile each, the way the rooms are drawn, and the whole tile opens it. The
 * colour a kind wears is assigned rather than asked for: it is the thing that
 * tells a life group from a ministry team across four screens, and a church
 * setting up has better questions to answer than which of twelve.
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

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("groups.failed")}>{error}</Banner> : null}

      {live.length === 0 && archived.length === 0 ? (
        <Empty
          icon="group"
          title={t("groupType.empty.title")}
          body={t("groupType.empty.body")}
          action={<TypeDialog church={church} pending={pending} />}
        />
      ) : (
        <>
          <div className="flex justify-end">
            <TypeDialog church={church} pending={pending} />
          </div>

          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
            {live.map((one) => (
              <TypeDialog
                key={one.id}
                church={church}
                pending={pending}
                type={one}
                onArchive={() => run(() => archiveType(one.id, true, church))}
                trigger={
                  <button
                    type="button"
                    className={`flex cursor-pointer items-center gap-2.5 rounded-[14px] border border-line bg-surface p-4 text-left ${LIFT}`}
                  >
                    <span className="min-w-0 flex-1 truncate font-semibold text-fg">
                      {one.name}
                    </span>
                  </button>
                }
              />
            ))}
          </div>
        </>
      )}

      {archived.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-label text-fg-muted">{t("groupType.archived")}</h2>
          {archived.map((one) => (
            <div key={one.id} className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[length:var(--d-text-body)] text-fg-muted">{one.name}</span>
              <Button
                variant="ghost"
                disabled={pending}
                className="h-8 min-h-0 px-2.5 text-[13px]"
                onClick={() => run(() => archiveType(one.id, false, church))}
              >
                <Undo2 className="size-4" aria-hidden /> {t("groupType.restore")}
              </Button>
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
  trigger,
  onArchive,
}: {
  church: string;
  pending: boolean;
  /** Given when an existing kind is being changed. */
  type?: TypeRow;
  trigger?: React.ReactNode;
  onArchive?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = useFormError(open);
  const [saving, startTransition] = React.useTransition();
  /*
   * R24.6. Asked in the panel that is already open rather than a second one
   * over it. A box on top of a box is one of the things this product refuses.
   */
  const [asking, setAsking] = React.useState(false);
  /** R24.6. Whether the panel has been typed in since it opened. */
  const [dirty, setDirty] = React.useState(false);

  const formId = React.useId();

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setAsking(false);
      setDirty(false);
    }
  };
  const { onOpenChange, guard } = usePanelGuard({ dirty, setOpen: close });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {trigger ?? <Button><Plus /> {t("groupType.add")}</Button>}
      </SheetTrigger>

      <SheetContent
        title={
          asking && type
            ? t("groupType.archiveTitle", { name: type.name })
            : type
              ? t("groupType.editTitle", { name: type.name })
              : t("groupType.newTitle")
        }
        closeLabel={t("common.close")}
        footer={
          asking && type && onArchive ? (
            <>
              <Button type="button" variant="ghost" onClick={() => setAsking(false)}>
                {t("groups.keep")}
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={pending}
                onClick={() => {
                  setAsking(false);
                  setOpen(false);
                  onArchive();
                }}
              >
                {t("groupType.archive")}
              </Button>
            </>
          ) : (
            <>
              {/* R9.2. Taking a kind off the list lives here rather than on the
                  tile, so the tile stays one thing to press. */}
              {type && onArchive ? (
                <IconButton
                  label={t("groupType.archive")}
                  variant="ghost"
                  className="mr-auto"
                  disabled={pending || saving}
                  onClick={() => setAsking(true)}
                >
                  <Archive />
                </IconButton>
              ) : null}
              <Button type="submit" form={formId} disabled={pending || saving || !dirty}>
                {t("action.save")}
              </Button>
            </>
          )
        }
      >
        {guard}

        {asking && type && onArchive ? (
          <p className="text-[length:var(--d-text-body)] text-fg">
            {t("groupType.archiveBody")}
          </p>
        ) : (
          <form
            id={formId}
            noValidate
            onInput={() => setDirty(true)}
            action={(data) => {
              data.set("church", church);
              if (type) {
                data.set("id", type.id);
                data.set("hue", type.hue);
              }
              startTransition(async () => {
                const result = await saveType(data);
                setError(result.error);
                if (!result.error) {
                  setDirty(false);
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
              <RichText
                name="description"
                defaultValue={type?.description ?? ""}
                minHeight={160}
              />
            </Field>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

