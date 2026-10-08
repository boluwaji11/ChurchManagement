"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, Plus, Undo2 } from "lucide-react";
import {
  Banner, Button, Dialog, DialogContent, DialogFooter, Field, IconButton, Input, LIFT,
  Sheet, SheetContent, SheetTrigger,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Empty } from "@/components/empty";
import { LibraryPicker } from "@/components/library-picker";
import { usePanelGuard } from "@/components/panel-guard";
import { itemKindLibrary } from "./library";
import { useFormError } from "@/lib/form-error";
import { saveKind, archiveKind } from "./actions";

export interface KindRow {
  id: string;
  /** What a plan item stores, so the library can leave out what is kept. */
  slug: string;
  /** The church's own word, or ours where it has not written one. */
  name: string;
  archived: boolean;
}

/**
 * R11.2. The kinds of item this church puts on a plan.
 *
 * A tile each, the way the group types are drawn. There is no colour to pick:
 * the plan already carries one a kind, assigned rather than asked for, and a
 * church writing down "Testimony" has better questions to answer.
 */
export function KindManager({ church, kinds }: { church: string; kinds: KindRow[] }) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();
  const [asking, setAsking] = React.useState<KindRow | null>(null);

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });

  const live = kinds.filter((one) => !one.archived);
  const archived = kinds.filter((one) => one.archived);
  const taken = kinds.map((one) => one.slug);

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("itemKind.failed")}>{error}</Banner> : null}

      {live.length === 0 && archived.length === 0 ? (
        <Empty
          icon="calendar"
          title={t("itemKind.empty.title")}
          body={t("itemKind.empty.body")}
          action={<KindPanel church={church} pending={pending} taken={taken} />}
        />
      ) : (
        <>
      <div className="flex justify-end">
        <KindPanel church={church} pending={pending} taken={taken} />
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(200px,100%),1fr))]">
        {live.map((one) => (
          <KindPanel
            key={one.id}
            church={church}
            pending={pending}
            kind={one}
            taken={taken}
            onArchive={() => setAsking(one)}
            trigger={
              <button
                type="button"
                className={`flex cursor-pointer items-center gap-2.5 rounded-[14px] border border-line bg-surface p-4 text-left ${LIFT}`}
              >
                <span className="min-w-0 flex-1 truncate font-semibold text-fg">{one.name}</span>
              </button>
            }
          />
        ))}
      </div>
        </>
      )}

      {archived.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-label text-fg-muted">{t("itemKind.archived")}</h2>
          {archived.map((one) => (
            <div key={one.id} className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[length:var(--d-text-body)] text-fg-muted">{one.name}</span>
              <Button
                variant="ghost"
                disabled={pending}
                className="h-8 min-h-0 px-2.5 text-[13px]"
                onClick={() => run(() => archiveKind(one.id, false, church))}
              >
                <Undo2 className="size-4" aria-hidden /> {t("itemKind.restore")}
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <Dialog open={asking !== null} onOpenChange={(on) => (on ? null : setAsking(null))}>
        <DialogContent alert title={t("itemKind.archiveTitle", { name: asking?.name ?? "" })}>
          <DialogFooter>
            <Button variant="ghost" data-dismiss onClick={() => setAsking(null)}>
              {t("itemKind.keep")}
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => {
                const one = asking;
                setAsking(null);
                if (one) run(() => archiveKind(one.id, true, church));
              }}
            >
              {t("itemKind.archive")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** R11.2. Writing a kind down, or changing what it is called. */
function KindPanel({
  church,
  pending,
  kind,
  taken = [],
  trigger,
  onArchive,
}: {
  church: string;
  pending: boolean;
  kind?: KindRow;
  /** What this church already keeps, so the library leaves it out. */
  taken?: string[];
  trigger?: React.ReactNode;
  onArchive?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, startTransition] = React.useTransition();
  const [dirty, setDirty] = React.useState(false);

  // R11.2. Writing one down opens on what churches already put on a plan.
  const library = React.useMemo(
    () => itemKindLibrary(taken),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [taken.join("|")],
  );
  const [picking, setPicking] = React.useState(!kind && library.length > 0);
  const [error, setError] = useFormError(open && !picking);
  const [name, setName] = React.useState(kind?.name ?? "");

  React.useEffect(() => {
    if (!open) return;
    setName(kind?.name ?? "");
  }, [open, kind?.name]);

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setDirty(false);
      setPicking(!kind && library.length > 0);
    }
  };
  const { onOpenChange, guard } = usePanelGuard({ dirty, setOpen: close });

  const save = (input: { name?: string; builtIn?: string } = { name }) =>
    startTransition(async () => {
      const result = await saveKind({ id: kind?.id, ...input }, church);
      setError(result.error);
      if (!result.error) {
        close(false);
        router.refresh();
      }
    });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {trigger ?? <Button><Plus /> {t("itemKind.add")}</Button>}
      </SheetTrigger>

      <SheetContent
        title={
          kind
            ? t("itemKind.editTitle", { name: kind.name })
            : picking
              ? t("itemKind.start")
              : t("itemKind.newTitle")
        }
        closeLabel={t("common.close")}
        footer={
          picking ? null : (
          <>
            {kind && onArchive ? (
              <IconButton
                label={t("itemKind.archive")}
                variant="ghost"
                className="mr-auto"
                disabled={pending || saving}
                onClick={() => {
                  close(false);
                  onArchive();
                }}
              >
                <Archive />
              </IconButton>
            ) : null}
            <Button
              type="button"
              disabled={pending || saving || !dirty || !name.trim()}
              loading={saving}
              onClick={() => save()}
            >
              {t("action.save")}
            </Button>
          </>
          )
        }
      >
        {guard}

        {picking ? (
          <LibraryPicker
            ownLabel={t("itemKind.ownKind")}
            items={library}
            onOwn={() => {
              setName("");
              setPicking(false);
            }}
            onPick={(item) => save({ builtIn: item.key })}
          />
        ) : (
        <div className="flex flex-col gap-4">
          {error ? <Banner tone="danger" title={t("itemKind.failed")}>{error}</Banner> : null}

          <Field label={t("itemKind.name")} required>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
              }}
              placeholder={t("itemKind.namePlaceholder")}
              autoComplete="off"
              autoFocus
            />
          </Field>
        </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
