"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Archive, Plus, Undo2 } from "lucide-react";
import {
  Banner, Button, Field, HueDot, HUES, IconButton, Input, LIFT,
  Sheet, SheetContent, SheetTrigger, type Hue,
} from "@connectapp/ui";
import { t } from "@connectapp/i18n";
import { Empty } from "@/components/empty";
import { RichText } from "@/components/rich-text";
import { usePanelGuard } from "@/components/panel-guard";
import { LibraryPicker } from "@/components/library-picker";
import { groupTypeLibrary } from "./library";
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
 * colour a kind wears runs down the left of every group filed under it, so a
 * church reading its groups tells a life group from a ministry team before it
 * has read a word. A new kind is given the next hue in the spectrum, and the
 * church changes it in the panel where it changes the name.
 */
export function TypeManager({
  church,
  types,
  taken,
  putAway,
}: {
  church: string;
  types: TypeRow[];
  /** R9.1. Every name this church keeps, archived ones included. */
  taken: string[];
  /** R24.6. Whether this is the shelf of kinds that have been put away. */
  putAway?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string>();
  const [pending, startTransition] = React.useTransition();

  const live = types;

  const run = (work: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error);
      if (!result.error) router.refresh();
    });

  if (putAway) {
    return (
      <div className="flex flex-col gap-4" aria-busy={pending}>
        {error ? <Banner tone="danger" title={t("groups.failed")}>{error}</Banner> : null}

        {types.length === 0 ? (
          <Empty icon="group" title={t("groupType.archived.none")} />
        ) : (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(230px,100%),1fr))]">
            {types.map((one) => (
              <div
                key={one.id}
                className="flex items-center gap-2 rounded-[14px] border border-line bg-surface p-4"
              >
                <span className="min-w-0 flex-1 truncate font-semibold text-fg-muted">
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
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      {error ? <Banner tone="danger" title={t("groups.failed")}>{error}</Banner> : null}

      {live.length === 0 ? (
        <Empty
          icon="group"
          title={t("groupType.empty.title")}
          body={t("groupType.empty.body")}
          action={<TypeDialog church={church} pending={pending} taken={taken} />}
        />
      ) : (
        <>
          <div className="flex justify-end">
            <TypeDialog church={church} pending={pending} taken={taken} />
          </div>

          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(230px,100%),1fr))]">
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
                    <HueDot hue={one.hue as Hue} />
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

    </div>
  );
}

/** R9.1. Writing a kind down, or changing one. */
function TypeDialog({
  church,
  pending,
  type,
  taken = [],
  trigger,
  onArchive,
}: {
  church: string;
  pending: boolean;
  /** Given when an existing kind is being changed. */
  type?: TypeRow;
  /** R9.1. What this church already keeps, so the library leaves it out. */
  taken?: string[];
  trigger?: React.ReactNode;
  onArchive?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, startTransition] = React.useTransition();
  /*
   * R24.6. Asked in the panel that is already open rather than a second one
   * over it. A box on top of a box is one of the things this product refuses.
   */
  const [asking, setAsking] = React.useState(false);
  /** R24.6. Whether the panel has been typed in since it opened. */
  const [dirty, setDirty] = React.useState(false);

  const formId = React.useId();

  // R9.1. Writing one opens on the kinds churches already run.
  const library = React.useMemo(() => groupTypeLibrary(taken), [taken.join("|")]);
  const [picking, setPicking] = React.useState(!type && library.length > 0);
  const [error, setError] = useFormError(open && !picking);
  const [name, setName] = React.useState(type?.name ?? "");
  const [body, setBody] = React.useState(type?.description ?? "");
  const [hue, setHue] = React.useState<Hue>((type?.hue as Hue) ?? HUES[0]);
  /** Remounts the editor when a ready-made kind fills it. */
  const [filled, setFilled] = React.useState(0);

  /*
   * R24.6. The panel is filled from the record each time it opens.
   *
   * It was filled once when the screen rendered and reset from whatever the
   * props held when it closed, so a saved edit was still showing the words it
   * had before the save until the whole page was reloaded.
   */
  React.useEffect(() => {
    if (!open) return;
    setName(type?.name ?? "");
    setBody(type?.description ?? "");
    setHue((type?.hue as Hue) ?? HUES[0]);
    setFilled((n) => n + 1);
  }, [open, type?.name, type?.description, type?.hue]);

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setAsking(false);
      setDirty(false);
      setPicking(!type && library.length > 0);
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
              : picking
                ? t("groupType.start")
                : t("groupType.newTitle")
        }
        closeLabel={t("common.close")}
        footer={
          picking ? null : asking && type && onArchive ? (
            <>
              <Button type="button" variant="ghost" onClick={() => setAsking(false)}>
                {t("groups.keep")}
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={pending}
                onClick={() => {
                  close(false);
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
              <Button type="submit" form={formId} disabled={pending || saving || !dirty || !name.trim()}>
                {t("action.save")}
              </Button>
            </>
          )
        }
      >
        {guard}

        {picking ? (
          <LibraryPicker
            ownLabel={t("groupType.ownType")}
            items={library}
            onOwn={() => {
              setName("");
              setBody("");
              setFilled((n) => n + 1);
              setPicking(false);
            }}
            onPick={(item) => {
              const picked = library.find((one) => one.key === item.key);
              setName(item.label);
              setBody(picked?.body ?? "");
              setFilled((n) => n + 1);
              setDirty(true);
              setPicking(false);
            }}
          />
        ) : asking && type && onArchive ? (
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
              data.set("hue", hue);
              if (type) data.set("id", type.id);
              startTransition(async () => {
                const result = await saveType(data);
                setError(result.error);
                if (!result.error) {
                  close(false);
                  router.refresh();
                }
              });
            }}
            className="flex flex-col gap-4"
          >
            {error ? <Banner tone="danger" title={t("groups.failed")}>{error}</Banner> : null}

            {type || library.length === 0 ? null : (
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="flex cursor-pointer items-center gap-1.5 self-start font-medium text-primary"
              >
                <ArrowLeft className="size-4" aria-hidden /> {t("fields.back")}
              </button>
            )}

            <Field label={t("groupType.name")} required>
              <Input
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
                autoFocus
              />
            </Field>

            {/* R9.1, R24.4. A hue does work here: it runs down the left of
                every group of this kind, so the list reads as groups of
                things rather than as one long list. */}
            <div className="flex flex-col gap-1.5">
              <span className="text-label text-fg">{t("groupType.colour")}</span>
              <div className="flex flex-wrap gap-1.5">
                {HUES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-label={t(`hue.${option}` as never)}
                    aria-pressed={hue === option}
                    onClick={() => {
                      setHue(option);
                      setDirty(true);
                    }}
                    className={
                      hue === option
                        ? "cursor-pointer rounded-full p-1 ring-2 ring-primary"
                        : "cursor-pointer rounded-full p-1 ring-2 ring-transparent hover:ring-line-strong"
                    }
                  >
                    <HueDot hue={option} />
                  </button>
                ))}
              </div>
            </div>

            <Field label={t("groupType.description")}>
              {/* R24.6. The box grows a little and then scrolls inside itself.
                  A panel whose footer is pushed off the bottom by a long
                  description is a panel with no way to save it. */}
              <RichText
                key={filled}
                name="description"
                defaultValue={body}
                minHeight={160}
                maxHeight={260}
              />
            </Field>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}

